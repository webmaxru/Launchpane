import AppKit
import Foundation

guard CommandLine.arguments.count == 7,
      let x = Double(CommandLine.arguments[3]),
      let y = Double(CommandLine.arguments[4]),
      let width = Double(CommandLine.arguments[5]),
      let height = Double(CommandLine.arguments[6]),
      let image = NSImage(contentsOfFile: CommandLine.arguments[1]),
      let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil),
      let context = CGContext(
        data: nil, width: cgImage.width, height: cgImage.height,
        bitsPerComponent: 8, bytesPerRow: cgImage.width * 4,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
      ) else {
    fatalError("Usage: swift redact-native-capture.swift source.png output.png x y width height (top-left pixels)")
}
guard x >= 0, y >= 0, width > 0, height > 0,
      x + width <= Double(cgImage.width), y + height <= Double(cgImage.height) else {
    fatalError("Privacy rectangle must fit inside the native capture.")
}
context.draw(cgImage, in: CGRect(x: 0, y: 0, width: cgImage.width, height: cgImage.height))
context.setFillColor(CGColor(red: 0.10, green: 0.10, blue: 0.12, alpha: 1))
context.fill(CGRect(x: x, y: Double(cgImage.height) - y - height, width: width, height: height))
guard let result = context.makeImage(),
      let png = NSBitmapImageRep(cgImage: result).representation(using: .png, properties: [:]) else {
    fatalError("Could not encode the privacy-redacted native capture.")
}
try png.write(to: URL(fileURLWithPath: CommandLine.arguments[2]))
