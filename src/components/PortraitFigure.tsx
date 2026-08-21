export function PortraitFigure() {
  return (
    <figure className="portrait-art portrait-art--screenprint">
      <picture className="portrait-picture">
        <source
          type="image/webp"
          srcSet="/images/portrait-cutout-480.webp 480w, /images/portrait-cutout-960.webp 960w"
          sizes="(min-width: 1024px) 30vw, 70vw"
        />
        <img
          src="/images/portrait-cutout-960.png"
          width="960"
          height="1129"
          alt="Jonny Haynes wearing glasses and an Ey Up cycling cap"
        />
      </picture>
    </figure>
  );
}
