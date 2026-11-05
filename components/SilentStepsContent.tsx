import FrozenGif from '@/components/FrozenGif'
import Lightbox from '@/components/Lightbox'
import RichContent, { youtubeEmbed } from '@/components/RichContent'
import type { SilentStepsContent as Content } from '@/lib/silent-steps'

function label(name: string, place: string, years: string) {
  return [name, years, place].filter(Boolean).join(' · ')
}

export default function SilentStepsContent({ content }: { content: Content }) {
  const total = content.years.reduce((sum, group) => sum + group.items.length, 0)

  return (
    <div className="pf-silent">
      <section className="pf-silent-intro" aria-label="About the series">
        <p className="pf-silent-lead">{content.lead}</p>
        {content.quote && <blockquote className="pf-silent-quote">“{content.quote}”</blockquote>}
        {content.about.length > 0 && (
          <div className="pf-silent-about">
            <p className="pf-eyebrow">ABOUT THE SERIES</p>
            <div>{content.about.map(text => <p key={text}>{text}</p>)}</div>
          </div>
        )}
      </section>

      <Lightbox>
        <section className="pf-silent-section" aria-labelledby="silent-animations">
          <div className="pf-section-heading">
            <div>
              <p className="pf-eyebrow">ANIMATIONS BY YEAR</p>
              <h2 id="silent-animations">{total} animations.</h2>
            </div>
            <nav className="pf-silent-years" aria-label="Jump to year">
              {content.years.map(group => <a key={group.year} href={`#year-${group.year}`}>{group.year}</a>)}
            </nav>
          </div>

          {content.years.map(group => (
            <section className="pf-silent-year" id={`year-${group.year}`} key={group.year} aria-labelledby={`year-title-${group.year}`}>
              <h3 id={`year-title-${group.year}`}>{group.year}<span>{group.items.length}</span></h3>
              <div className="pf-silent-grid">
                {group.items.map(item => {
                  const embed = item.video ? youtubeEmbed(item.video) : null
                  return (
                    <figure key={item.id} className={embed ? (item.description ? 'is-paired has-description' : 'is-paired') : undefined}>
                      <div className="pf-silent-media">
                        <FrozenGif src={item.src} name={item.name} caption={label(item.name, item.place, item.years)} />
                        {embed && <div className="pf-silent-video"><iframe src={embed} title={`${item.name} video`} loading="lazy" allowFullScreen /></div>}
                        {embed && item.description && <p className="pf-silent-description"><strong>{item.description.split('. ')[0]}.</strong>{item.description.includes('. ') ? ` ${item.description.slice(item.description.indexOf('. ') + 2)}` : ''}</p>}
                      </div>
                      <figcaption>
                        <strong>{item.name}</strong>
                        <span>{[item.years, item.place].filter(Boolean).join(' · ')}</span>
                        {item.note && <em>{item.note}</em>}
                      </figcaption>
                    </figure>
                  )
                })}
              </div>
            </section>
          ))}
        </section>

        {content.videos.length > 0 && (
          <section className="pf-silent-section" aria-labelledby="silent-films">
            <div className="pf-section-heading"><div><p className="pf-eyebrow">ON FILM</p><h2 id="silent-films">In motion.</h2></div></div>
            <div className="pf-silent-films">
              {content.videos.map(video => {
                const embed = youtubeEmbed(video.url)
                return embed ? (
                  <figure key={video.id}>
                    <div className="pf-video"><iframe src={embed} title={video.caption || 'Silent Steps video'} loading="lazy" allowFullScreen /></div>
                    {video.caption && <figcaption>{video.caption}</figcaption>}
                  </figure>
                ) : null
              })}
            </div>
          </section>
        )}

        {content.photos.length > 0 && (
          <section className="pf-silent-section" aria-labelledby="silent-photos">
            <div className="pf-section-heading"><div><p className="pf-eyebrow">PHOTO GALLERY</p><h2 id="silent-photos">On the streets.</h2></div><span className="pf-card-year">{content.photos.length} photographs</span></div>
            <div className="pf-silent-photos">
              {content.photos.map((photo, index) => (
                <button type="button" className="pf-lightbox-trigger" key={photo.id} data-lightbox={photo.src} data-alt={`Silent Steps photograph ${index + 1}`} aria-label={`Open photograph ${index + 1}`}>
                  <img src={photo.src} alt={`Silent Steps photograph ${index + 1}`} loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          </section>
        )}
      </Lightbox>

      {content.rest.length > 0 && <div className="pf-silent-rest pf-detail-content"><RichContent blocks={content.rest} /></div>}
    </div>
  )
}
