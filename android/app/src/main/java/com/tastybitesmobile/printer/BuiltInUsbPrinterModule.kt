package com.tastybitesmobile.printer

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build
import android.util.Base64
import android.util.Log
import com.caysn.autoreplyprint.AutoReplyPrint
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.sun.jna.Pointer
import java.util.concurrent.Executors

/**
 * Native bridge to AutoReplyPrint for the POS tablet built-in 80mm USB printer.
 *
 * Keep the path simple (matches the previously working raw-write flow):
 * open → write ticket → feed + half-cut → close
 *
 * Avoid Reset/ClearBuffer/BlackMark toggle before every job — those can latch
 * the head into a state that only recovers after reseating paper.
 */
class BuiltInUsbPrinterModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  private val executor = Executors.newSingleThreadExecutor()
  private val permissionLock = Object()
  @Volatile private var permissionGranted: Boolean? = null

  private val usbPermissionReceiver =
    object : BroadcastReceiver() {
      override fun onReceive(context: Context?, intent: Intent?) {
        if (intent?.action != ACTION_USB_PERMISSION) return
        val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
        synchronized(permissionLock) {
          permissionGranted = granted
          permissionLock.notifyAll()
        }
      }
    }

  init {
    val filter = IntentFilter(ACTION_USB_PERMISSION)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      reactContext.registerReceiver(usbPermissionReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      @Suppress("DEPRECATION")
      reactContext.registerReceiver(usbPermissionReceiver, filter)
    }
  }

  override fun getName(): String = NAME

  override fun invalidate() {
    try {
      reactContext.unregisterReceiver(usbPermissionReceiver)
    } catch (_: Exception) {
      // already unregistered
    }
    executor.shutdownNow()
    super.invalidate()
  }

  @ReactMethod
  fun isAvailable(promise: Promise) {
    executor.execute {
      try {
        val device = findPrinterUsbDevice()
        val map = Arguments.createMap()
        map.putBoolean("available", device != null)
        if (device != null) {
          map.putString(
            "portName",
            String.format("VID:0x%04X,PID:0x%04X", device.vendorId, device.productId),
          )
          map.putInt("vendorId", device.vendorId)
          map.putInt("productId", device.productId)
          map.putBoolean("hasPermission", hasUsbPermission(device))
        }
        promise.resolve(map)
      } catch (err: Exception) {
        promise.reject("USB_CHECK_FAILED", err.message, err)
      }
    }
  }

  @ReactMethod
  fun listUsbDevices(promise: Promise) {
    executor.execute {
      try {
        val usbManager =
          reactContext.getSystemService(Context.USB_SERVICE) as? UsbManager
        val devices = Arguments.createArray()
        if (usbManager == null) {
          promise.resolve(devices)
          return@execute
        }
        for (device in usbManager.deviceList.values) {
          val map = Arguments.createMap()
          val product =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
              device.productName
            } else {
              null
            }
          val manufacturer =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
              device.manufacturerName
            } else {
              null
            }
          val displayName =
            listOfNotNull(manufacturer, product)
              .joinToString(" ")
              .ifBlank { device.deviceName }
          map.putString("name", displayName)
          map.putString("deviceName", device.deviceName)
          map.putInt("vendorId", device.vendorId)
          map.putInt("productId", device.productId)
          map.putBoolean("hasPermission", usbManager.hasPermission(device))
          map.putBoolean(
            "likelyPrinter",
            KNOWN_VENDOR_IDS.contains(device.vendorId) ||
              (product?.contains("print", ignoreCase = true) == true) ||
              (product?.contains("pos", ignoreCase = true) == true),
          )
          devices.pushMap(map)
        }
        promise.resolve(devices)
      } catch (err: Exception) {
        promise.reject("USB_LIST_FAILED", err.message, err)
      }
    }
  }

  @ReactMethod
  fun printBase64(base64Data: String, promise: Promise) {
    printBase64ForDevice(base64Data, null, null, promise)
  }

  @ReactMethod
  fun printBase64ForIds(
    base64Data: String,
    vendorId: Int,
    productId: Int,
    promise: Promise,
  ) {
    printBase64ForDevice(base64Data, vendorId, productId, promise)
  }

  private fun printBase64ForDevice(
    base64Data: String,
    vendorId: Int?,
    productId: Int?,
    promise: Promise,
  ) {
    executor.execute {
      var handle: Pointer? = Pointer.NULL
      try {
        if (base64Data.isBlank()) {
          promise.reject("EMPTY_DATA", "Print data is empty")
          return@execute
        }

        val device =
          findPrinterUsbDevice(vendorId, productId)
            ?: run {
              promise.reject("NO_PRINTER", "USB printer not found")
              return@execute
            }

        if (!ensureUsbPermission(device)) {
          promise.reject("NO_PERMISSION", "USB permission denied for printer")
          return@execute
        }

        val portName =
          String.format("VID:0x%04X,PID:0x%04X", device.vendorId, device.productId)
        handle = AutoReplyPrint.INSTANCE.CP_Port_OpenUsb(portName, 0)
        if (handle == null || handle == Pointer.NULL ||
          !AutoReplyPrint.INSTANCE.CP_Port_IsOpened(handle)
        ) {
          promise.reject("OPEN_FAILED", "Failed to open USB printer port ($portName)")
          return@execute
        }

        try {
          AutoReplyPrint.INSTANCE.CP_Printer_ClearPrinterError(handle)
        } catch (err: Exception) {
          Log.w(NAME, "ClearPrinterError: ${err.message}")
        }

        // Do NOT call CP_BlackMark_DisableBlackMarkMode — on this head it
        // prints the literal text "Disable BM Mode" and feeds a long blank gap.
        // Do NOT ResetPrinter here either — ESC @ is already in the ticket
        // bytes; an extra reset before write adds top margin.

        val decoded = Base64.decode(base64Data, Base64.DEFAULT)
        if (decoded.isEmpty()) {
          promise.reject("EMPTY_DATA", "Decoded print data is empty")
          return@execute
        }

        // Force 80mm area into the ESC/POS stream itself (after every ESC @).
        val bytes = sanitizeEscPosForBuiltIn80mm(decoded)
        Log.i(NAME, "Writing ${bytes.size} bytes to $portName (80mm sanitized)")
        val written =
          AutoReplyPrint.INSTANCE.CP_Port_Write(handle, bytes, bytes.size, WRITE_TIMEOUT_MS)
        if (written != bytes.size) {
          promise.reject(
            "WRITE_FAILED",
            "USB write incomplete ($written / ${bytes.size} bytes)",
          )
          return@execute
        }

        // Wait until the head finishes the ticket before cutting.
        try {
          val printed =
            AutoReplyPrint.INSTANCE.CP_Pos_QueryPrintResult(handle, QUERY_PRINT_TIMEOUT_MS)
          Log.i(NAME, "QueryPrintResult=$printed")
        } catch (err: Exception) {
          Log.w(NAME, "QueryPrintResult: ${err.message}")
        }

        // Do NOT use FeedAndHalfCut — on this POS it advances a long blank
        // strip looking for a cut/mark position and often never fires the blade.
        cutPaperTight(handle)

        try {
          Thread.sleep(150)
        } catch (_: InterruptedException) {
          // ignore
        }

        val map = Arguments.createMap()
        map.putBoolean("success", true)
        map.putString("portName", portName)
        map.putInt("bytesWritten", written)
        promise.resolve(map)
      } catch (err: Exception) {
        Log.e(NAME, "PRINT_FAILED: ${err.message}", err)
        promise.reject("PRINT_FAILED", err.message, err)
      } finally {
        if (handle != null && handle != Pointer.NULL) {
          try {
            AutoReplyPrint.INSTANCE.CP_Port_Close(handle)
          } catch (_: Exception) {
            // ignore
          }
        }
      }
    }
  }

  private fun findPrinterUsbDevice(
    preferredVendorId: Int? = null,
    preferredProductId: Int? = null,
  ): UsbDevice? {
    val usbManager =
      reactContext.getSystemService(Context.USB_SERVICE) as? UsbManager ?: return null

    if (preferredVendorId != null && preferredProductId != null) {
      val exact =
        usbManager.deviceList.values.firstOrNull {
          it.vendorId == preferredVendorId && it.productId == preferredProductId
        }
      if (exact != null) return exact
    }

    try {
      val paths = AutoReplyPrint.CP_Port_EnumUsb_Helper.EnumUsb()
      if (paths != null) {
        for (path in paths) {
          val match = Regex("""VID:0x([0-9A-Fa-f]+),PID:0x([0-9A-Fa-f]+)""").find(path)
          if (match != null) {
            val vid = match.groupValues[1].toInt(16)
            val pid = match.groupValues[2].toInt(16)
            val device =
              usbManager.deviceList.values.firstOrNull {
                it.vendorId == vid && it.productId == pid
              }
            if (device != null) return device
          }
        }
      }
    } catch (_: Exception) {
      // fall through to VID scan
    }

    for (device in usbManager.deviceList.values) {
      if (KNOWN_VENDOR_IDS.contains(device.vendorId)) {
        return device
      }
    }
    val all = usbManager.deviceList.values.toList()
    if (all.size == 1) return all[0]
    return all.firstOrNull()
  }

  private fun hasUsbPermission(device: UsbDevice): Boolean {
    val usbManager =
      reactContext.getSystemService(Context.USB_SERVICE) as? UsbManager ?: return false
    return usbManager.hasPermission(device)
  }

  private fun ensureUsbPermission(device: UsbDevice): Boolean {
    val usbManager =
      reactContext.getSystemService(Context.USB_SERVICE) as? UsbManager ?: return false
    if (usbManager.hasPermission(device)) return true

    synchronized(permissionLock) {
      permissionGranted = null
      val flags =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          PendingIntent.FLAG_MUTABLE
        } else {
          0
        }
      val pi =
        PendingIntent.getBroadcast(
          reactContext,
          0,
          Intent(ACTION_USB_PERMISSION).setPackage(reactContext.packageName),
          flags,
        )
      usbManager.requestPermission(device, pi)

      val deadline = System.currentTimeMillis() + PERMISSION_TIMEOUT_MS
      while (permissionGranted == null && System.currentTimeMillis() < deadline) {
        try {
          permissionLock.wait(200)
        } catch (_: InterruptedException) {
          break
        }
      }
      return permissionGranted == true
    }
  }

  /**
   * Minimal feed + real cutter commands. Prefer HalfCut / FullCut / raw GS V
   * over FeedAndHalfCut (that API overfeeds on this built-in head).
   */
  private fun cutPaperTight(handle: Pointer) {
    // Leave a short tear gap under the last line (thank-you / KOT footer).
    try {
      AutoReplyPrint.INSTANCE.CP_Pos_FeedLine(handle, 2)
    } catch (err: Exception) {
      Log.w(NAME, "FeedLine before cut: ${err.message}")
    }

    try {
      val half = AutoReplyPrint.INSTANCE.CP_Pos_HalfCutPaper(handle)
      Log.i(NAME, "HalfCutPaper=$half")
      if (half) return
    } catch (err: Exception) {
      Log.w(NAME, "HalfCutPaper: ${err.message}")
    }

    try {
      val full = AutoReplyPrint.INSTANCE.CP_Pos_FullCutPaper(handle)
      Log.i(NAME, "FullCutPaper=$full")
      if (full) return
    } catch (err: Exception) {
      Log.w(NAME, "FullCutPaper: ${err.message}")
    }

    // Fallback raw cut — only if SDK cut APIs failed.
    val cuts =
      arrayOf(
        byteArrayOf(0x1d, 0x56, 0x01), // GS V 1 partial
        byteArrayOf(0x1b, 0x69), // ESC i full
      )
    for (cmd in cuts) {
      try {
        AutoReplyPrint.INSTANCE.CP_Port_Write(handle, cmd, cmd.size, 3_000)
      } catch (err: Exception) {
        Log.w(NAME, "Raw cut write: ${err.message}")
      }
    }
    Log.i(NAME, "Raw cut fallback sent")
  }

  companion object {
    const val NAME = "BuiltInUsbPrinter"
    private const val ACTION_USB_PERMISSION = "com.tastybitesmobile.USB_PERMISSION"
    private const val WRITE_TIMEOUT_MS = 15_000
    private const val QUERY_PRINT_TIMEOUT_MS = 10_000
    private const val PERMISSION_TIMEOUT_MS = 20_000L
    private const val PRINT_AREA_DOTS_80MM = 576
    private val KNOWN_VENDOR_IDS = setOf(0x0fe6, 0x4b43)

    /** Left-align + margin 0 + 576-dot print width (after every ESC @). */
    private val FULL_WIDTH_80MM =
      byteArrayOf(
        0x1b, 0x61, 0x00, // ESC a 0 left
        0x1d, 0x4c, 0x00, 0x00, // GS L nL nH = 0
        0x1d, 0x57, 0x40, 0x02, // GS W nL nH = 576
      )

    /**
     * Strip cut / narrow-width commands, force 80mm print area after resets,
     * and collapse trailing blank lines so cut sits right under the ticket.
     */
    @JvmStatic
    fun sanitizeEscPosForBuiltIn80mm(input: ByteArray): ByteArray {
      val out = ArrayList<Byte>(input.size + 32)
      var i = 0
      var sawReset = false
      while (i < input.size) {
        val b = input[i].toInt() and 0xff

        // GS V … cut — strip; native cutPaperTight handles the blade.
        if (b == 0x1d && i + 1 < input.size && (input[i + 1].toInt() and 0xff) == 0x56) {
          val m = if (i + 2 < input.size) input[i + 2].toInt() and 0xff else -1
          i +=
            when {
              m == 0x00 || m == 0x01 || m == 0x30 || m == 0x31 -> 3
              m == 0x41 || m == 0x42 || m == 0x61 || m == 0x66 -> 4
              else -> 3
            }
          continue
        }

        // ESC i / ESC m — legacy cut
        if (b == 0x1b && i + 1 < input.size) {
          val n = input[i + 1].toInt() and 0xff
          if (n == 0x69 || n == 0x6d) {
            i += 2
            continue
          }
        }

        // GS L nL nH — drop stale left margin (we inject 0 after ESC @)
        if (b == 0x1d && i + 3 < input.size && (input[i + 1].toInt() and 0xff) == 0x4c) {
          i += 4
          continue
        }

        // GS W nL nH — drop narrow width (we inject 576 after ESC @)
        if (b == 0x1d && i + 3 < input.size && (input[i + 1].toInt() and 0xff) == 0x57) {
          i += 4
          continue
        }

        // ESC @ reset — keep it, then force full 80mm area
        if (b == 0x1b && i + 1 < input.size && (input[i + 1].toInt() and 0xff) == 0x40) {
          out.add(0x1b.toByte())
          out.add(0x40.toByte())
          for (x in FULL_WIDTH_80MM) out.add(x)
          sawReset = true
          i += 2
          continue
        }

        out.add(input[i])
        i += 1
      }

      if (!sawReset) {
        val prefixed = ArrayList<Byte>(out.size + FULL_WIDTH_80MM.size + 2)
        prefixed.add(0x1b.toByte())
        prefixed.add(0x40.toByte())
        for (x in FULL_WIDTH_80MM) prefixed.add(x)
        prefixed.addAll(out)
        out.clear()
        out.addAll(prefixed)
      }

      while (out.isNotEmpty() && out[out.size - 1] == 0x0a.toByte()) {
        out.removeAt(out.size - 1)
      }
      out.add(0x0a.toByte())
      return out.toByteArray()
    }

    @JvmStatic
    fun stripEscPosCutCommands(input: ByteArray): ByteArray =
      sanitizeEscPosForBuiltIn80mm(input)
  }
}
