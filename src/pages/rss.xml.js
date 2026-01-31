import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const entries = (await getCollection('writing'))
    .filter((e) => !e.data.draft)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  return rss({
    title: 'Guilherme Salome — Writing',
    description: 'Practical notes on programming, statistics, causal inference, and building.',
    site: context.site,
    items: entries.map((entry) => ({
      title: entry.data.title,
      pubDate: entry.data.pubDate,
      description: entry.data.description,
      link: `/writing/${entry.slug}/`,
    })),
  });
}
