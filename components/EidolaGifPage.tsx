import ImageStack from '@/components/ImageStack'
import type { EidolaGif } from '@/lib/eidola-gifs'

// A GIF page: the GIF on top, then the pictures of its folder as the stacked-card slider.
export default function EidolaGifPage({ gif }: { gif: EidolaGif }) {
  const picture = <img src={gif.page} alt={gif.title} decoding="async" />
  return (
    <div className="pf-gif-page">
      <figure className="pf-gif-figure">
        {gif.original
          ? <button type="button" className="pf-lightbox-trigger pf-zoom" data-lightbox={gif.original} data-alt={gif.title} aria-label={`Enlarge ${gif.title}`}>{picture}</button>
          : picture}
      </figure>
      {gif.slides.length > 0 && <ImageStack items={gif.slides.map(slide => ({ kind: 'image' as const, ...slide }))} />}
    </div>
  )
}
