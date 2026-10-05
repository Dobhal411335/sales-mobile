package com.tastybitesmobile.display

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import java.io.File
import java.io.FileOutputStream
import java.nio.charset.Charset
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicReference

/**
 * Drives the POS customer LED / VFD price panel (客显) over UART.
 *
 * Protocol matches vendor PosTest [KexianActivity] (CD5220-style):
 *   ESC s <mode> ESC Q A <asciiAmount> CR
 * Modes: '1' price, '2' total, '3' collect, '4' change.
 *
 * The black tinted window on some housings is decorative glass — not this LED.
 */
class SerialPriceDisplayModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  private val io = Executors.newSingleThreadExecutor()
  private val preferredPort = AtomicReference("AUTO")
  private val preferredBaud = AtomicReference(2400)

  override fun getName(): String = NAME

  @ReactMethod
  fun listPorts(promise: Promise) {
    io.execute {
      try {
        val ports = discoverPorts()
        val arr: WritableArray = Arguments.createArray()
        for (p in ports) arr.pushString(p)
        val map: WritableMap = Arguments.createMap()
        map.putArray("ports", arr)
        map.putString("selectedPort", preferredPort.get())
        map.putInt("baud", preferredBaud.get())
        promise.resolve(map)
      } catch (err: Exception) {
        promise.reject("PRICE_PORTS_FAILED", err.message, err)
      }
    }
  }

  @ReactMethod
  fun configure(port: String?, baud: Int, promise: Promise) {
    io.execute {
      try {
        val cleaned = port?.trim().orEmpty()
        preferredPort.set(if (cleaned.isEmpty()) "AUTO" else cleaned)
        if (baud > 0) preferredBaud.set(baud)
        val map = Arguments.createMap()
        map.putBoolean("success", true)
        map.putString("port", preferredPort.get())
        map.putInt("baud", preferredBaud.get())
        promise.resolve(map)
      } catch (err: Exception) {
        promise.reject("PRICE_CONFIG_FAILED", err.message, err)
      }
    }
  }

  @ReactMethod
  fun showAmount(amountText: String?, mode: String?, promise: Promise) {
    io.execute {
      try {
        val modeChar = modeChar(mode)
        val amount = normalizeAmount(amountText)
        val payload = buildFrame(modeChar, amount)
        val result = writePayload(payload)
        promise.resolve(result)
      } catch (err: Exception) {
        promise.reject("PRICE_SHOW_FAILED", err.message, err)
      }
    }
  }

  @ReactMethod
  fun clear(promise: Promise) {
    io.execute {
      try {
        // ESC @ clears many CD5220-compatible panels
        val clearCmd = byteArrayOf(0x1B, 0x40)
        val result = writePayload(clearCmd)
        // Also show 0.00 in total mode so panels that ignore ESC @ still reset
        if (result.getBoolean("success")) {
          writePayload(buildFrame('2', "0.00"))
        }
        promise.resolve(result)
      } catch (err: Exception) {
        promise.reject("PRICE_CLEAR_FAILED", err.message, err)
      }
    }
  }

  private fun modeChar(mode: String?): Char {
    return when ((mode ?: "total").trim().lowercase()) {
      "price", "1" -> '1'
      "collect", "payment", "3" -> '3'
      "change", "4" -> '4'
      else -> '2' // total
    }
  }

  private fun normalizeAmount(raw: String?): String {
    val cleaned =
      (raw ?: "0")
        .trim()
        .replace("$", "")
        .replace(",", "")
        .replace(Regex("[^0-9.\\-]"), "")
    val n = cleaned.toDoubleOrNull() ?: 0.0
    return String.format(java.util.Locale.US, "%.2f", kotlin.math.abs(n))
  }

  private fun buildFrame(mode: Char, amount: String): ByteArray {
    val prefix =
      byteArrayOf(
        0x1B,
        's'.code.toByte(),
        mode.code.toByte(),
        0x1B,
        'Q'.code.toByte(),
        'A'.code.toByte(),
      )
    val body = amount.toByteArray(Charset.forName("US-ASCII"))
    return prefix + body + byteArrayOf(0x0D)
  }

  private fun writePayload(payload: ByteArray): WritableMap {
    val baud = preferredBaud.get()
    val configured = preferredPort.get()
    val candidates =
      if (configured.equals("AUTO", ignoreCase = true) || configured.isBlank()) {
        discoverPorts().ifEmpty { DEFAULT_PORTS.toList() }
      } else {
        listOf(configured)
      }

    var lastError: String? = null
    for (port in candidates) {
      try {
        configureBaud(port, baud)
        FileOutputStream(File(port), false).use { out ->
          out.write(payload)
          out.flush()
        }
        val map = Arguments.createMap()
        map.putBoolean("success", true)
        map.putString("port", port)
        map.putInt("baud", baud)
        // Remember working AUTO pick
        if (configured.equals("AUTO", ignoreCase = true)) {
          preferredPort.set(port)
        }
        return map
      } catch (err: Exception) {
        lastError = "${port}: ${err.message}"
      }
    }

    val map = Arguments.createMap()
    map.putBoolean("success", false)
    map.putString(
      "error",
      lastError
        ?: "No serial customer price port available. Test with PosTest → Kexian first.",
    )
    return map
  }

  private fun configureBaud(port: String, baud: Int) {
    try {
      val proc =
        ProcessBuilder("stty", "-F", port, baud.toString(), "raw", "-echo", "cs8", "-parenb", "-cstopb")
          .redirectErrorStream(true)
          .start()
      proc.waitFor()
    } catch (_: Exception) {
      // Baud configure is best-effort; many firmwares already leave the port at 2400.
    }
  }

  private fun discoverPorts(): List<String> {
    val found = linkedSetOf<String>()
    for (i in 0..9) {
      val path = "/dev/ttyS$i"
      val f = File(path)
      if (f.exists()) found.add(path)
    }
    // Prefer common POS customer-display UARTs first
    val preferredOrder = listOf("/dev/ttyS3", "/dev/ttyS4", "/dev/ttyS1", "/dev/ttyS0", "/dev/ttyS5")
    val ordered = mutableListOf<String>()
    for (p in preferredOrder) if (found.contains(p)) ordered.add(p)
    for (p in found) if (!ordered.contains(p)) ordered.add(p)
    return ordered
  }

  companion object {
    const val NAME = "SerialPriceDisplay"
    private val DEFAULT_PORTS = arrayOf("/dev/ttyS3", "/dev/ttyS4", "/dev/ttyS1", "/dev/ttyS0")
  }
}
