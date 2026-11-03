type BlogFigureProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
};

export function BlogFigure({ src, alt, width, height, caption }: BlogFigureProps) {
  return (
    <figure>
      {/* eslint-disable-next-line @next/next/no-img-element -- imagens sao unoptimized no projeto */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        className="mx-auto h-auto max-h-[640px] w-auto max-w-full rounded-panel border border-border"
      />
      {caption && <figcaption className="text-center">{caption}</figcaption>}
    </figure>
  );
}
