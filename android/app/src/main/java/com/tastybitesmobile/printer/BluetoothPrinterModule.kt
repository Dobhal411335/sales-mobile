package com.tastybitesmobile.printer

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.pm.PackageManager
import android.os.Build
import android.util.Base64
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import java.io.IOException
import java.util.UUID
import java.util.concurrent.Executors

/**
 * Classic Bluetooth SPP bridge for ESC/POS thermal printers.
 * Discovers paired + nearby devices and writes raw base64 ticket bytes.
 */
class BluetoothPrinterModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  private val executor = Executors.newSingleThreadExecutor()

  override fun getName(): String = NAME

  override fun invalidate() {
    executor.shutdownNow()
    super.invalidate()
  }

  @ReactMethod
  fun getAdapterState(promise: Promise) {
    executor.execute {
      try {
        val adapter = BluetoothAdapter.getDefaultAdapter()
        val map = Arguments.createMap()
        if (adapter == null) {
          map.putBoolean("supported", false)
          map.putBoolean("enabled", false)
          map.putString("state", "UNSUPPORTED")
          promise.resolve(map)
          return@execute
        }
        map.putBoolean("supported", true)
        map.putBoolean("enabled", adapter.isEnabled)
        map.putString(
          "state",
          when (adapter.state) {
            BluetoothAdapter.STATE_OFF -> "OFF"
            BluetoothAdapter.STATE_TURNING_ON -> "TURNING_ON"
            BluetoothAdapter.STATE_ON -> "ON"
            BluetoothAdapter.STATE_TURNING_OFF -> "TURNING_OFF"
            else -> "UNKNOWN"
          },
        )
        map.putBoolean("hasPermission", hasBluetoothPermissions())
        promise.resolve(map)
      } catch (err: Exception) {
        promise.reject("BT_STATE_FAILED", err.message, err)
      }
    }
  }

  @SuppressLint("MissingPermission")
  @ReactMethod
  fun listDevices(promise: Promise) {
    executor.execute {
      try {
        if (!hasBluetoothPermissions()) {
          promise.reject(
            "NO_PERMISSION",
            "Bluetooth permission required. Allow Nearby devices / Bluetooth and try again.",
          )
          return@execute
        }
        val adapter = BluetoothAdapter.getDefaultAdapter()
        if (adapter == null) {
          promise.reject("UNSUPPORTED", "Bluetooth is not supported on this device")
          return@execute
        }
        if (!adapter.isEnabled) {
          promise.reject("BT_OFF", "Turn on Bluetooth")
          return@execute
        }

        val devices: WritableArray = Arguments.createArray()
        val seen = HashSet<String>()

        fun addDevice(device: BluetoothDevice, bonded: Boolean) {
          val address = device.address ?: return
          val key = address.uppercase()
          if (!seen.add(key)) return
          val map = Arguments.createMap()
          map.putString("name", device.name ?: "Bluetooth Printer")
          map.putString("address", address.uppercase())
          map.putBoolean("bonded", bonded)
          map.putInt("bondState", device.bondState)
          map.putInt("deviceClass", device.bluetoothClass?.deviceClass ?: 0)
          devices.pushMap(map)
        }

        for (device in adapter.bondedDevices ?: emptySet()) {
          addDevice(device, true)
        }

        // Discovery is async; return bonded immediately + start discovery for UI refresh
        try {
          if (adapter.isDiscovering) {
            adapter.cancelDiscovery()
          }
          adapter.startDiscovery()
        } catch (err: Exception) {
          Log.w(NAME, "startDiscovery: ${err.message}")
        }

        promise.resolve(devices)
      } catch (err: Exception) {
        promise.reject("BT_LIST_FAILED", err.message, err)
      }
    }
  }

  @SuppressLint("MissingPermission")
  @ReactMethod
  fun stopScan(promise: Promise) {
    executor.execute {
      try {
        val adapter = BluetoothAdapter.getDefaultAdapter()
        if (adapter != null && hasBluetoothPermissions() && adapter.isDiscovering) {
          adapter.cancelDiscovery()
        }
        promise.resolve(true)
      } catch (err: Exception) {
        promise.reject("BT_STOP_FAILED", err.message, err)
      }
    }
  }

  @SuppressLint("MissingPermission")
  @ReactMethod
  fun printBase64(address: String, base64Data: String, promise: Promise) {
    executor.execute {
      var socket: BluetoothSocket? = null
      try {
        if (!hasBluetoothPermissions()) {
          promise.reject("NO_PERMISSION", "Bluetooth permission required")
          return@execute
        }
        val adapter = BluetoothAdapter.getDefaultAdapter()
        if (adapter == null) {
          promise.reject("UNSUPPORTED", "Bluetooth is not supported on this device")
          return@execute
        }
        if (!adapter.isEnabled) {
          promise.reject("BT_OFF", "Turn on Bluetooth")
          return@execute
        }
        val mac = address.trim().uppercase()
        if (!MAC_RE.matches(mac)) {
          promise.reject("BAD_ADDRESS", "Invalid Bluetooth MAC address")
          return@execute
        }
        if (base64Data.isBlank()) {
          promise.reject("EMPTY_DATA", "Print data is empty")
          return@execute
        }

        if (adapter.isDiscovering) {
          adapter.cancelDiscovery()
        }

        val device = adapter.getRemoteDevice(mac)
        socket = openSppSocket(device)
        val out = socket.outputStream
        val decoded = Base64.decode(base64Data, Base64.DEFAULT)
        if (decoded.isEmpty()) {
          promise.reject("EMPTY_DATA", "Decoded print data is empty")
          return@execute
        }
        out.write(decoded)
        out.flush()
        try {
          Thread.sleep(250)
        } catch (_: InterruptedException) {
          // ignore
        }

        val map: WritableMap = Arguments.createMap()
        map.putBoolean("success", true)
        map.putString("address", mac)
        map.putInt("bytesWritten", decoded.size)
        promise.resolve(map)
      } catch (err: Exception) {
        Log.e(NAME, "BT print failed: ${err.message}", err)
        promise.reject("BT_PRINT_FAILED", err.message, err)
      } finally {
        try {
          socket?.close()
        } catch (_: Exception) {
          // ignore
        }
      }
    }
  }

  @SuppressLint("MissingPermission")
  @ReactMethod
  fun probe(address: String, promise: Promise) {
    executor.execute {
      var socket: BluetoothSocket? = null
      try {
        if (!hasBluetoothPermissions()) {
          promise.reject("NO_PERMISSION", "Bluetooth permission required")
          return@execute
        }
        val adapter = BluetoothAdapter.getDefaultAdapter()
        if (adapter == null) {
          promise.reject("UNSUPPORTED", "Bluetooth is not supported on this device")
          return@execute
        }
        if (!adapter.isEnabled) {
          promise.reject("BT_OFF", "Turn on Bluetooth")
          return@execute
        }
        val mac = address.trim().uppercase()
        if (!MAC_RE.matches(mac)) {
          promise.reject("BAD_ADDRESS", "Invalid Bluetooth MAC address")
          return@execute
        }
        if (adapter.isDiscovering) {
          adapter.cancelDiscovery()
        }
        val device = adapter.getRemoteDevice(mac)
        socket = openSppSocket(device)
        val map = Arguments.createMap()
        map.putBoolean("success", true)
        map.putString("address", mac)
        map.putString("name", device.name)
        promise.resolve(map)
      } catch (err: Exception) {
        promise.reject("BT_PROBE_FAILED", err.message, err)
      } finally {
        try {
          socket?.close()
        } catch (_: Exception) {
          // ignore
        }
      }
    }
  }

  @SuppressLint("MissingPermission")
  private fun openSppSocket(device: BluetoothDevice): BluetoothSocket {
    // Prefer insecure SPP first (many cheap ESC/POS printers); fall back to secure.
    val attempts =
      listOf(
        { device.createInsecureRfcommSocketToServiceRecord(SPP_UUID) },
        { device.createRfcommSocketToServiceRecord(SPP_UUID) },
      )
    var last: Exception? = null
    for (factory in attempts) {
      var socket: BluetoothSocket? = null
      try {
        socket = factory()
        socket.connect()
        return socket
      } catch (err: Exception) {
        last = err
        try {
          socket?.close()
        } catch (_: Exception) {
          // ignore
        }
      }
    }
    throw last ?: IOException("Unable to open Bluetooth SPP socket")
  }

  private fun hasBluetoothPermissions(): Boolean {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      ContextCompat.checkSelfPermission(
        reactContext,
        Manifest.permission.BLUETOOTH_CONNECT,
      ) == PackageManager.PERMISSION_GRANTED &&
        ContextCompat.checkSelfPermission(
          reactContext,
          Manifest.permission.BLUETOOTH_SCAN,
        ) == PackageManager.PERMISSION_GRANTED
    } else {
      ContextCompat.checkSelfPermission(
        reactContext,
        Manifest.permission.BLUETOOTH,
      ) == PackageManager.PERMISSION_GRANTED
    }
  }

  companion object {
    const val NAME = "BluetoothPrinter"
    private val SPP_UUID: UUID =
      UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    private val MAC_RE = Regex("^([0-9A-F]{2}:){5}[0-9A-F]{2}$")
  }
}
