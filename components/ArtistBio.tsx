// **bold** marks the names worth finding at a glance.
const paragraphs = [
  "Kaybid is an Istanbul-based street artist whose multidisciplinary practice encompasses collage, photography, animation, sculpture, installation, and digital art. Having studied painting, the artist has been creating works in public spaces since 2018, exploring the relationships between urban life, nature, and the ways in which non-human living beings exist within these environments.",
  "His artistic practice primarily examines the human-centered structure of cities, humanity's growing disconnection from nature, and concepts of existence, disappearance, and impermanence. Incorporating discarded materials into his creative process, the artist produces his collages entirely by hand, using traditional techniques without digital tools. Through small-scale interventions in the everyday flow of public spaces, he creates unexpected encounters with viewers.",
  "In his ongoing series **“Silent Steps,”** initiated in 2018, Kaybid places handmade collages of wild animals, created from discarded paper, throughout urban streets. Each figure represents a different moment of movement and is individually photographed in its surroundings before being transformed into looping stop-motion animations. Through photography and video, he documents the gradual deterioration, transformation, and disappearance of his works in public spaces, preserving their temporary physical presence in a digital format. In his recent practice, he has increasingly focused on sculptures and installations made from discarded materials, exploring material transformation, reuse, and the relationship between objects and space on different scales.",
  "Kaybid has created works in cities including Istanbul, Paris, Amsterdam, Lisbon, and Milan. His works have been featured in numerous national and international exhibitions, festivals, and public art events, including the **16th Istanbul Biennial Public Programme, Mamut Art Project, Digital Graffiti Festival in Florida, Greenpoint Gallery Night in New York, Times Square, and STRAAT Museum in Amsterdam.** In 2025, his solo exhibition **“Volta,”** held at Oktowallz in Istanbul, brought together collage, animation, and experimental music, further expanding his interdisciplinary artistic practice.",
]

function bold(text: string) {
  return text.split('**').map((piece, index) => index % 2 === 1 ? <strong key={index}>{piece}</strong> : piece)
}

export default function ArtistBio() {
  return (
    <section className="pf-bio" aria-labelledby="artist-name">
      <h2 id="artist-name">Kaybid</h2>
      <div className="pf-bio-text">
        {paragraphs.map((text, index) => <p key={index} className={index === 0 ? 'is-lead' : undefined}>{bold(text)}</p>)}
      </div>
    </section>
  )
}
