import ImageStack from '@/components/ImageStack'
import type { EidolaGif } from '@/lib/eidola-gifs'

// An Eidōla work's page: the pictures of its folder as the stacked-card slider.
export default function EidolaGifPage({ gif }: { gif: EidolaGif }) {
  return (
    <div className="pf-gif-page">
      {gif.slides.length > 0 && <ImageStack items={gif.slides.map(slide => ({ kind: 'image' as const, ...slide }))} />}
    </div>
  )
}
