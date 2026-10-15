import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

struct RenderJob: Decodable {
    let source: String
    let output: String
    let width: Int
    let height: Int
}

enum RenderError: Error {
    case invalidImage(String)
    case cannotRender(String)
}

let jobs = try JSONDecoder().decode(
    [RenderJob].self, from: FileHandle.standardInput.readDataToEndOfFile()
)
for job in jobs {
    guard job.width > 0, job.height > 0,
          let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: job.source) as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
        throw RenderError.invalidImage(job.source)
    }
    // Explicit RGB storage avoids OS-dependent alpha preservation by ImageIO.
    guard let context = CGContext(
        data: nil, width: job.width, height: job.height,
        bitsPerComponent: 8, bytesPerRow: job.width * 4,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
    ) else {
        throw RenderError.cannotRender(job.output)
    }
    context.interpolationQuality = .high
    let bounds = CGRect(x: 0, y: 0, width: job.width, height: job.height)
    context.setFillColor(CGColor(gray: 0, alpha: 1))
    context.fill(bounds)
    context.draw(image, in: bounds)
    guard let rendered = context.makeImage() else {
        throw RenderError.cannotRender(job.output)
    }
    let output = URL(fileURLWithPath: job.output)
    try FileManager.default.createDirectory(
        at: output.deletingLastPathComponent(), withIntermediateDirectories: true
    )
    guard let destination = CGImageDestinationCreateWithURL(
        output as CFURL, UTType.png.identifier as CFString, 1, nil
    ) else {
        throw RenderError.cannotRender(job.output)
    }
    CGImageDestinationAddImage(destination, rendered, nil)
    guard CGImageDestinationFinalize(destination) else {
        throw RenderError.cannotRender(job.output)
    }
}
