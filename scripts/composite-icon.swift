#!/usr/bin/swift
import AppKit
import CoreGraphics
import UniformTypeIdentifiers

enum Mode: String {
  case opaqueDark = "opaque-dark"
  case dark = "dark"
  case tinted = "tinted"
}

func parseHex(_ hex: String) -> (CGFloat, CGFloat, CGFloat) {
  let h = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
  guard h.count == 6, let value = Int(h, radix: 16) else { return (0.031, 0.031, 0.031) }
  return (
    CGFloat((value >> 16) & 0xFF) / 255,
    CGFloat((value >> 8) & 0xFF) / 255,
    CGFloat(value & 0xFF) / 255
  )
}

func loadCGImage(_ path: String) -> CGImage? {
  guard let image = NSImage(contentsOfFile: path) else { return nil }
  var rect = CGRect(origin: .zero, size: image.size)
  return image.cgImage(forProposedRect: &rect, context: nil, hints: nil)
}

func resize(_ image: CGImage, to size: Int) -> CGImage? {
  let width = size
  let height = size
  guard let ctx = CGContext(
    data: nil,
    width: width,
    height: height,
    bitsPerComponent: 8,
    bytesPerRow: 0,
    space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
  ) else { return nil }
  ctx.interpolationQuality = .high
  ctx.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
  return ctx.makeImage()
}

func writePNG(_ image: CGImage, to path: String) -> Bool {
  let url = URL(fileURLWithPath: path)
  guard let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else { return false }
  CGImageDestinationAddImage(dest, image, nil)
  return CGImageDestinationFinalize(dest)
}

func composite(_ source: CGImage, size: Int, bg: (CGFloat, CGFloat, CGFloat)?, grayscale: Bool) -> CGImage? {
  guard let resized = resize(source, to: size) else { return nil }
  let width = size
  let height = size
  let alphaInfo: CGImageAlphaInfo = bg == nil ? .premultipliedLast : .noneSkipLast
  let bitmapInfo = CGBitmapInfo(rawValue: alphaInfo.rawValue)
  guard let ctx = CGContext(
    data: nil,
    width: width,
    height: height,
    bitsPerComponent: 8,
    bytesPerRow: 0,
    space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: bitmapInfo.rawValue
  ) else { return nil }

  if let bg {
    ctx.setFillColor(red: bg.0, green: bg.1, blue: bg.2, alpha: 1)
    ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))
  }

  ctx.interpolationQuality = .high
  ctx.draw(resized, in: CGRect(x: 0, y: 0, width: width, height: height))

  guard var output = ctx.makeImage() else { return nil }

  if grayscale, let gray = output.grayscale() {
    output = gray
  }

  return output
}

extension CGImage {
  func grayscale() -> CGImage? {
    guard let ctx = CGContext(
      data: nil,
      width: width,
      height: height,
      bitsPerComponent: 8,
      bytesPerRow: 0,
      space: CGColorSpaceCreateDeviceGray(),
      bitmapInfo: CGImageAlphaInfo.alphaOnly.rawValue
    ) else { return nil }

    ctx.draw(self, in: CGRect(x: 0, y: 0, width: width, height: height))
    guard let alphaMask = ctx.makeImage() else { return nil }

    guard let out = CGContext(
      data: nil,
      width: width,
      height: height,
      bitsPerComponent: 8,
      bytesPerRow: 0,
      space: CGColorSpaceCreateDeviceGray(),
      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else { return nil }

    out.clip(to: CGRect(x: 0, y: 0, width: width, height: height), mask: alphaMask)
    out.setFillColor(gray: 1, alpha: 1)
    out.fill(CGRect(x: 0, y: 0, width: width, height: height))
    return out.makeImage()
  }
}

let args = CommandLine.arguments
guard args.count >= 5,
      let mode = Mode(rawValue: args[1]) else {
  fputs("Usage: composite-icon.swift <opaque-dark|dark|tinted> <bg-hex> <input.png> <output.png> [size]\n", stderr)
  exit(1)
}

let bgHex = args[2]
let input = args[3]
let output = args[4]
let size = args.count > 5 ? (Int(args[5]) ?? 1024) : 1024

guard let source = loadCGImage(input) else {
  fputs("Could not load \(input)\n", stderr)
  exit(1)
}

let bgColor = parseHex(bgHex)
let image: CGImage?
switch mode {
case .opaqueDark:
  image = composite(source, size: size, bg: bgColor, grayscale: false)
case .dark:
  image = composite(source, size: size, bg: nil, grayscale: false)
case .tinted:
  image = composite(source, size: size, bg: nil, grayscale: true)
}

guard let image, writePNG(image, to: output) else {
  fputs("Could not write \(output)\n", stderr)
  exit(1)
}
