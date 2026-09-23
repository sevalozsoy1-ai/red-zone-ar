package com.ephesusmedya.redzonear

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.UIManagerHelper

class BeaconCameraViewManager : SimpleViewManager<BeaconCameraView>() {
  override fun getName(): String = "RedZoneBeaconCamera"

  override fun createViewInstance(reactContext: ThemedReactContext): BeaconCameraView {
    val view = BeaconCameraView(reactContext)
    view.onBeacon = { markerId, confidence ->
      view.post {
        UIManagerHelper.getEventDispatcherForReactTag(reactContext, view.id)?.dispatchEvent(
          BeaconDetectedEvent(reactContext.surfaceId, view.id, markerId, confidence),
        )
      }
    }
    view.onStatus = { state, message ->
      view.post {
        UIManagerHelper.getEventDispatcherForReactTag(reactContext, view.id)?.dispatchEvent(
          BeaconCameraStatusEvent(reactContext.surfaceId, view.id, state, message),
        )
      }
    }
    return view
  }

  @ReactProp(name = "ownBeaconId", defaultInt = -1)
  fun setOwnBeaconId(view: BeaconCameraView, value: Int) {
    view.ownBeaconId = value.coerceIn(-1, 9)
  }

  @ReactProp(name = "enabled", defaultBoolean = true)
  fun setEnabled(view: BeaconCameraView, value: Boolean) {
    view.beaconEnabled = value
  }

  @ReactProp(name = "zoomRatio", defaultFloat = 1f)
  fun setZoomRatio(view: BeaconCameraView, value: Float) {
    view.zoomRatio = value
  }

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> =
    mutableMapOf(
      "topBeaconDetected" to mapOf("registrationName" to "onBeaconDetected"),
      "topCameraStatus" to mapOf("registrationName" to "onCameraStatus"),
    )

  override fun onDropViewInstance(view: BeaconCameraView) {
    view.release()
    super.onDropViewInstance(view)
  }
}