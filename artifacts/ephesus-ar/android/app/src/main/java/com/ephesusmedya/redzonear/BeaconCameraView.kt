package com.ephesusmedya.redzonear

import android.Manifest
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.View.MeasureSpec
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.camera.core.CameraControl
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageProxy
import androidx.camera.view.LifecycleCameraController
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.Observer
import com.facebook.react.uimanager.ThemedReactContext
import java.util.ArrayDeque
import java.util.concurrent.CancellationException
import java.util.concurrent.ExecutionException
import java.util.concurrent.Executors

/**
 * A deliberately conservative temporal beacon detector. It samples only the
 * central 22% square, keeps a short luminance history, and requires a strong
 * repeating code before emitting a target. Static bright areas and ordinary
 * exposure changes therefore never become a hit.
 */
class BeaconCameraView(context: ThemedReactContext) : FrameLayout(context) {
  var onBeacon: ((Int, Float) -> Unit)? = null
  var onStatus: ((String, String) -> Unit)? = null
  @Volatile var ownBeaconId: Int = -1
    set(value) {
      if (field != value) clearEvidence()
      field = value
      scheduleTorch()
    }
  @Volatile var beaconEnabled: Boolean = true
    set(value) {
      field = value
      if (value) startCamera() else pauseCamera()
    }
  var zoomRatio: Float = 1f
    set(value) {
      field = if (value.isFinite()) value.coerceAtLeast(1f) else 1f
      applyZoom()
    }

  private val preview = PreviewView(context)
  private val controller = LifecycleCameraController(context)
  private val executor = Executors.newSingleThreadExecutor()
  private val handler = Handler(Looper.getMainLooper())
  private val samples = ArrayDeque<Sample>()
  private var torchRunnable: Runnable? = null
  private var started = false
  private var lastDecodeAt = 0L
  private var lastQualifiedAt = 0L
  private var lastMarker = -1
  private var torchReady = false
  private var torchStarted = false
  private var torchRequestInFlight = false
  private var torchRequestStartedAt = 0L
  private var lastTorchConfirmedAt = 0L
  private var torchFailure: String? = null
  private var previewStreaming = false
  @Volatile private var lastFrameAt = 0L
  @Volatile private var lastLuminance = -1
  private var cameraStartedAt = 0L
  private var streamOwner: LifecycleOwner? = null
  private val streamObserver = Observer<PreviewView.StreamState> { streamState ->
    previewStreaming = streamState == PreviewView.StreamState.STREAMING
    reportCameraReadiness()
  }
  private val readinessCheck = object : Runnable {
    override fun run() {
      if (!started || !beaconEnabled) return
      reportCameraReadiness()
      handler.postDelayed(this, 1000L)
    }
  }

  private data class Sample(val time: Long, val luminance: Float, val surround: Float)

  // 20 balanced symbols, 100 ms each. The fixed codebook has no rotational
  // duplicates and a cyclic Hamming distance >= 6/20 (> 5/16).
  private val codes = arrayOf(
    "11010111000101001100", "01111111010100001000",
    "00010101001110111100", "00001101011110101010",
    "00000001111100111101", "00001010111010011101",
    "00000011001111110110", "00001011001010111011",
    "00110001001111001110", "00100101011010110011",
  )

  init {
    preview.layoutParams = LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
    // PreviewView defaults to a SurfaceView-backed performance mode. A
    // SurfaceView is composed outside the normal React Native view hierarchy
    // and can render black when this camera is nested inside Animated.Views.
    // COMPATIBLE uses TextureView so the room camera participates in the same
    // transformed/composited hierarchy as the HUD.
    preview.implementationMode = PreviewView.ImplementationMode.COMPATIBLE
    preview.scaleType = PreviewView.ScaleType.FILL_CENTER
    addView(preview)
    controller.cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
    controller.setImageAnalysisAnalyzer(executor) { image -> analyze(image) }
    post { startCamera() }
  }

  override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
    super.onSizeChanged(w, h, oldw, oldh)
    // React Native lays out this FrameLayout, not its native child. Force the
    // PreviewView to occupy the measured surface, including after rotation.
    if (w > 0 && h > 0) {
      preview.measure(
        MeasureSpec.makeMeasureSpec(w, MeasureSpec.EXACTLY),
        MeasureSpec.makeMeasureSpec(h, MeasureSpec.EXACTLY),
      )
      preview.layout(0, 0, w, h)
    }
  }

  private fun reportCameraReadiness() {
    if (!started || !beaconEnabled) return
    val age = SystemClock.elapsedRealtime() - lastFrameAt
    if (previewStreaming && lastFrameAt >= cameraStartedAt && age < 2500L) {
      if (torchStarted && torchFailure == null
        && SystemClock.elapsedRealtime() - lastTorchConfirmedAt > 5000L) {
        failTorch()
        return
      }
      if (torchFailure != null) {
        onStatus?.invoke("error", torchFailure!!)
        return
      }
      onStatus?.invoke("live", "Önizleme var · kare var · ışık $lastLuminance · flaş ${if (torchStarted) "komutlandı" else "bekliyor"}")
      if (!torchStarted && torchReady && ownBeaconId in 0..9) {
        torchStarted = true
        lastTorchConfirmedAt = SystemClock.elapsedRealtime()
        scheduleTorch()
      }
    } else if (SystemClock.elapsedRealtime() - cameraStartedAt >= 5000L) {
      onStatus?.invoke(
        "error",
        "Oda kamerası görüntü üretmiyor (önizleme: ${if (previewStreaming) "var" else "yok"}, analiz: ${if (lastFrameAt >= cameraStartedAt) "var" else "yok"}, boyut: ${width}x${height}). Tekrar deneyin.",
      )
    }
  }

  private fun startCamera() {
    if (!beaconEnabled || started) return
    val activity = (context as? ThemedReactContext)?.currentActivity
    if (activity == null || ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
      onStatus?.invoke("blocked", "Arka kamera izni gerekli")
      return
    }
    val owner = activity as? LifecycleOwner
    if (owner == null) {
      onStatus?.invoke("error", "Kamera yaşam döngüsü kullanılamıyor")
      return
    }
    try {
      // Attach the surface before binding the camera session.
      preview.controller = controller
      controller.bindToLifecycle(owner)
      torchReady = controller.cameraInfo?.hasFlashUnit() == true
      torchFailure = if (torchReady) null else "Bu telefonda arka flaş beacon desteklenmiyor"
      started = true
      applyZoom()
      cameraStartedAt = SystemClock.elapsedRealtime()
      lastFrameAt = 0L
      lastLuminance = -1
      previewStreaming = false
      streamOwner?.let { preview.previewStreamState.removeObserver(streamObserver) }
      streamOwner = owner
      preview.previewStreamState.observe(owner, streamObserver)
      onStatus?.invoke("requesting", "Oda kamerasının ilk görüntüsü bekleniyor")
      handler.removeCallbacks(readinessCheck)
      handler.postDelayed(readinessCheck, 1000L)
    } catch (_: Throwable) {
      try { controller.unbind() } catch (_: Throwable) {}
      onStatus?.invoke("error", "Arka kamera başlatılamadı")
    }
  }

  private fun applyZoom() {
    if (!started) return
    val maximum = controller.cameraInfo?.zoomState?.value?.maxZoomRatio ?: 1f
    val requested = zoomRatio.coerceIn(1f, maximum.coerceAtLeast(1f))
    // Zoom is cosmetic; a device rejecting it must never stop analysis.
    try { controller.cameraControl?.setZoomRatio(requested) } catch (_: Throwable) {}
  }

  private fun analyze(image: ImageProxy) {
    try {
      if (!beaconEnabled) return
      val plane = image.planes.firstOrNull() ?: return
      val buffer = plane.buffer
      val width = image.width
      val height = image.height
      val rowStride = plane.rowStride
      val pixelStride = plane.pixelStride
      val left = (width * 0.39f).toInt()
      val right = (width * 0.61f).toInt()
      val top = (height * 0.39f).toInt()
      val bottom = (height * 0.61f).toInt()
      var total = 0L
      var count = 0
      var surroundTotal = 0L
      var surroundCount = 0
      for (y in top until bottom step 4) {
        for (x in left until right step 4) {
          val index = y * rowStride + x * pixelStride
          if (index < buffer.limit()) {
            total += buffer.get(index).toInt() and 0xff
            count++
          }
        }
      }
      for (y in (height * 0.30f).toInt() until (height * 0.70f).toInt() step 6) {
        for (x in (width * 0.30f).toInt() until (width * 0.70f).toInt() step 6) {
          if (x in left..right && y in top..bottom) continue
          val index = y * rowStride + x * pixelStride
          if (index < buffer.limit()) {
            surroundTotal += buffer.get(index).toInt() and 0xff
            surroundCount++
          }
        }
      }
      if (count > 0) {
        val now = SystemClock.elapsedRealtime()
        lastLuminance = (total / count).toInt()
        lastFrameAt = now
        synchronized(samples) {
          samples.addLast(
            Sample(
              now,
              total.toFloat() / count,
              if (surroundCount > 0) surroundTotal.toFloat() / surroundCount else 0f,
            ),
          )
          while (samples.isNotEmpty() && now - samples.first.time > 4500L) samples.removeFirst()
          if (now - lastDecodeAt > 180L) {
            lastDecodeAt = now
            decode(now)
          }
        }
      }
    } finally {
      image.close()
    }
  }

  private fun decode(now: Long) {
    if (samples.size < 28) return
    val values = samples.map { it.luminance }
    val low = values.sorted()[values.size / 10]
    val high = values.sorted()[(values.size * 9) / 10]
    val contrast = high - low
    // A beacon must have contrast both recently and across the full rolling
    // window. This rejects a single exposure jump and static bright objects.
    val recent = values.takeLast((values.size * 0.28f).toInt().coerceAtLeast(8))
    val recentContrast = recent.maxOrNull()!! - recent.minOrNull()!!
    if (contrast < 32f || recentContrast < 22f) {
      clearStale(now)
      return
    }
    val threshold = low + contrast * 0.52f
    var bestId = -1
    var best = 0f
    var second = 0f
    val symbol = 100L
    // Require at least two complete periods and evidence that the newest
    // period is transitioning, rather than periodically replaying old data.
    if (now - samples.first.time < symbol * 40L) {
      clearStale(now)
      return
    }
    val newest = samples.filter { now - it.time <= symbol * 5L }
    if (newest.isEmpty()) {
      clearStale(now)
      return
    }
    val newestRange = newest.maxOf { it.luminance } - newest.minOf { it.luminance }
    val compactness = newest
      .map { it.luminance - it.surround }
      .average()
    if (newestRange < 12f || compactness < 7.0) {
      clearStale(now)
      return
    }
    // Search both the unknown code phase and all cyclic offsets.
    for (id in codes.indices) {
      var scoreForCode = 0f
      for (phase in 0L until symbol step 10L) {
        for (rotation in codes[id].indices) {
          var matches = 0
          var considered = 0
          for (sample in samples) {
            val bitIndex = (((sample.time + phase) / symbol).toInt() + rotation) % codes[id].length
            val expected = codes[id][bitIndex] == '1'
            val observed = sample.luminance > threshold
            matches += if (expected == observed) 1 else 0
            considered++
          }
          val score = matches.toFloat() / considered.toFloat()
          if (score > scoreForCode) scoreForCode = score
        }
      }
      if (scoreForCode > best) {
        second = best
        best = scoreForCode
        bestId = id
      } else if (scoreForCode > second) {
        second = scoreForCode
      }
    }
    if (bestId >= 0 && best >= 0.82f && best - second >= 0.07f && bestId != ownBeaconId) {
      // The JS combat gate needs two independent recent detections. Emitting
      // only when the ID changes permanently prevented target authorization.
      lastMarker = bestId
      lastQualifiedAt = now
      onBeacon?.invoke(bestId, best)
    } else {
      clearStale(now)
    }
  }

  private fun clearStale(now: Long) {
    if (lastMarker != -1 && now - lastQualifiedAt > 220L) {
      lastMarker = -1
      samples.clear()
      onBeacon?.invoke(-1, 0f)
    }
  }

  private fun scheduleTorch() {
    stopTorch()
    if (!beaconEnabled || ownBeaconId !in 0..9 || !started || !torchReady || torchFailure != null) return
    val id = ownBeaconId
    val runnable = object : Runnable {
      override fun run() {
        if (!beaconEnabled || ownBeaconId != id) return
        if (torchRequestInFlight) {
          if (SystemClock.elapsedRealtime() - torchRequestStartedAt > 800L) {
            failTorch()
            return
          }
          handler.postDelayed(this, 25L)
          return
        }
        val symbol = ((SystemClock.elapsedRealtime() / 100L).toInt()) % 20
        val on = codes[id][symbol] == '1'
        try {
          val future = controller.cameraControl?.enableTorch(on)
          if (future == null) {
            handler.postDelayed(this, 105L)
            return
          }
          torchRequestInFlight = true
          torchRequestStartedAt = SystemClock.elapsedRealtime()
          future?.addListener({
            try {
              // CameraX cancels an unfinished enableTorch future when the next
              // beacon symbol supersedes it. That is expected at this cadence
              // and must not tear down an otherwise healthy camera session.
              if (future.isCancelled) return@addListener
              future.get()
              lastTorchConfirmedAt = SystemClock.elapsedRealtime()
            } catch (error: Throwable) {
              if (isSupersededTorchRequest(error)) return@addListener
              if (beaconEnabled && started) {
                failTorch()
              }
            } finally {
              torchRequestInFlight = false
            }
          }, ContextCompat.getMainExecutor(context))
        } catch (_: Throwable) {
          failTorch()
          return
        }
        handler.postDelayed(this, 105L)
      }
    }
    torchRunnable = runnable
    handler.post(runnable)
  }

  private fun failTorch() {
    torchFailure = "Arka flaş beacon çalıştırılamadı; kimlik iletilemiyor. Tekrar deneyin."
    stopTorch()
    onStatus?.invoke("error", torchFailure!!)
  }

  private fun isSupersededTorchRequest(error: Throwable): Boolean {
    var current: Throwable? = error
    while (current != null) {
      if (
        current is CancellationException ||
        current is CameraControl.OperationCanceledException
      ) return true
      current = if (current is ExecutionException) current.cause else current.cause
    }
    return false
  }

  private fun stopTorch() {
    torchRunnable?.let { handler.removeCallbacks(it) }
    torchRunnable = null
    torchRequestInFlight = false
    try { controller.cameraControl?.enableTorch(false) } catch (_: Throwable) {}
  }

  private fun clearEvidence() {
    synchronized(samples) {
      samples.clear()
      lastMarker = -1
      lastDecodeAt = 0L
      lastQualifiedAt = 0L
    }
    onBeacon?.invoke(-1, 0f)
  }

  private fun pauseCamera() {
    handler.removeCallbacks(readinessCheck)
    streamOwner?.let { preview.previewStreamState.removeObserver(streamObserver) }
    streamOwner = null
    previewStreaming = false
    lastFrameAt = 0L
    stopTorch()
    clearEvidence()
    if (started) {
      try { controller.unbind() } catch (_: Throwable) {}
    }
    started = false
    torchReady = false
    torchStarted = false
    torchFailure = null
  }

  fun release() {
    pauseCamera()
    controller.clearImageAnalysisAnalyzer()
    preview.controller = null
    executor.shutdownNow()
  }
}