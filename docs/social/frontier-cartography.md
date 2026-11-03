# TYSA social image: design notes

Built from the app's own design system (`apps/web/app/globals.css`) so posts look like the product.

- **Ground:** near-black `#111112`, cards `#1F1F22`, input edge `#3A3C41`, border `#2E3034`.
- **Ink:** off-white `#F2F4F6` for primary text, `#9FA4AB` for secondary.
- **Logo:** the current TYSA block-letter icon (`apps/desktop/resources/icon.png`), as white letters with no tile. The canvas is entirely monochrome.
- **Type:** Figtree for everything; JetBrains Mono only for the URL. The headline copies the home screen's "Knowledge graph" title: solid words, then an outlined phrase.
- **Motif:** the knowledge-graph sphere from the home screen, a point sphere densest at the rim, with scattered mono glyphs (`% & # [ ] { } < > = 0 1`). It's dimmed behind text so nothing collides.
- **Chrome:** the real composer ("What do you want to learn?", return and mic icons) and the Guided / Textbook / Practice tabs anchor the bottom.

Renderer: Pillow, 2x supersampled, 1080×1350 output.

## X version

`tysa-x.png`: the same design at 16:9 (1600×900, rendered at 2× to 3200×1800). The headline runs on two lines, with the outlined phrase on its own. The sphere is drawn with the home screen's own maths (`sphere-backdrop.tsx`: 44 latitude rings, the same tilt and perspective), and it fades out above the composer so the bottom chrome stays clean. The Meta mark is the Simple Icons path from `provider-logo.tsx`.

Renderer: HTML in headless Chrome (puppeteer-core), with fonts from `video/fonts`.
