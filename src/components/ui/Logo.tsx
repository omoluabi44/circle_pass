import Link from 'next/link';

interface LogoProps {
  className?: string;
  withLink?: boolean;
  imageClassName?: string;
  textClassName?: string;
}

export function Logo({
  className = "flex items-center space-x-2",
  withLink = true,
  imageClassName = "h-8 w-auto object-contain",
  textClassName = "text-xl tracking-tight text-logo font-logo whitespace-nowrap"
}: LogoProps) {
  const content = (
    <>
      <img src="/logo.png" alt="CirclePass Logo" className={imageClassName} />
      <span className={textClassName}>CirclePass</span>
    </>
  );

  if (withLink) {
    return (
      <Link href="/" className={className}>
        {content}
      </Link>
    );
  }

  return (
    <div className={className}>
      {content}
    </div>
  );
}
