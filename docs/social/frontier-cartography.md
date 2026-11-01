# TYSA social image: design notes

Built from the app's own design system (`apps/web/app/globals.css`) so posts look like the product.

- **Ground:** near-black `#111112`, cards `#1F1F22`, input edge `#3A3C41`, border `#2E3034`.
- **Ink:** off-white `#F2F4F6` for primary text, `#9FA4AB` for secondary.
- **Logo:** the current TYSA block-letter icon (`apps/desktop/resources/icon.png`), as white letters with no tile. The canvas is entirely monochrome.
- **Type:** Figtree for everything; JetBrains Mono only for the URL. The headline copies the home screen's "Knowledge graph" title: solid words, then an outlined phrase.
- **Motif:** the knowledge-graph sphere from the home screen, a point sphere densest at the rim, with scattered mono glyphs (`% & # [ ] { } < > = 0 1`). It's dimmed behind text so nothing collides.
- **Chrome:** the real composer ("What do you want to learn?", return and mic icons) and the Guided / Textbook / Practice tabs anchor the bottom.

Renderer: Pillow, 2x supersampled, 1080×1350 output.
