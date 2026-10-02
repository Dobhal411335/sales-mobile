package com.tastybitesmobile

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.tastybitesmobile.display.CustomerDisplayPackage
import com.tastybitesmobile.printer.BluetoothPrinterPackage
import com.tastybitesmobile.printer.BuiltInUsbPrinterPackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(BuiltInUsbPrinterPackage())
          add(BluetoothPrinterPackage())
          add(CustomerDisplayPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
