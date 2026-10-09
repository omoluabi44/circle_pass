import { Metadata, ResolvingMetadata } from "next";
import { getEventBySlug } from "@/lib/api/events";
import EventClient from "./EventClient";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  
  try {
    const event = await getEventBySlug(slug);
    if (!event) return { title: "Event not found | CirclePass" };

    const title = event.title || "CirclePass Event";
    
    // Create a plain text description
    let description = event.description || "Join us for this amazing experience on CirclePass!";
    // Strip HTML if any
    description = description.replace(/<[^>]*>?/gm, '');
    if (description.length > 200) {
      description = description.substring(0, 197) + "...";
    }
    
    // Build an absolute URL for the image
    let imageUrl = event.cover_image || event.image;
    
    if (imageUrl) {
      if (!imageUrl.startsWith("http")) {
        // Fallback domain if env variable isn't set
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://circlepass.ng";
        if (imageUrl.startsWith('/media/')) {
            const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'https://circlepass-production.up.railway.app';
            imageUrl = `${apiBase}${imageUrl}`;
        } else {
            imageUrl = `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
        }
      }
    } else {
      imageUrl = "https://circlepass.ng/circlepass_bg.png"; // fallback image
    }

    return {
      title: `${title} | CirclePass`,
      description,
      openGraph: {
        title,
        description,
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl],
      },
    };
  } catch (error) {
    return {
      title: "CirclePass Event",
      description: "Get your digital pass & show up for experiences that matter.",
    };
  }
}

export default async function EventPage({ params }: Props) {
  // Pass the slug to the client component or let it use useParams
  // It already uses useParams internally
  return <EventClient />;
}
