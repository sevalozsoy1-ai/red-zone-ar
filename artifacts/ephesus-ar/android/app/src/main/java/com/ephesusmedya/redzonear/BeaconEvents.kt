package com.ephesusmedya.redzonear

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

class BeaconDetectedEvent(
  surfaceId: Int,
  viewTag: Int,
  private val markerId: Int,
  private val confidence: Float,
) : Event<BeaconDetectedEvent>(surfaceId, viewTag) {
  override fun getEventName(): String = "topBeaconDetected"
  override fun getEventData(): WritableMap = Arguments.createMap().apply {
    putInt("markerId", markerId)
    putDouble("confidence", confidence.toDouble())
  }
}

class BeaconCameraStatusEvent(
  surfaceId: Int,
  viewTag: Int,
  private val state: String,
  private val message: String,
) : Event<BeaconCameraStatusEvent>(surfaceId, viewTag) {
  override fun getEventName(): String = "topCameraStatus"
  override fun getEventData(): WritableMap = Arguments.createMap().apply {
    putString("state", state)
    putString("message", message)
  }
}