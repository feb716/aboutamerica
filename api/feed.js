// File: api/feed.js

const Parser = require('rss-parser');
const parser = new Parser({
    // Set parser to handle media image namespaces
    customFields: {
        item: ['media:content', 'enclosure', 'content:encoded', 'description'] 
    },
    headers: { 'User-Agent': 'Custom US News Aggregator Bot' }
});

// US NEWS SOURCES (Fox US, NYT)
const RSS_FEEDS = [
    { title: 'Fox News - Most Popular (US)', url: 'https://feeds.foxnews.com/foxnews/most-popular' },
    { title: 'The New York Times - Homepage', url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml' } 
];

// Function: Attempt to find the image link
function findImage(item) {
    if (item['media:content'] && item['media:content']['$'] && item['media:content']['$].url) {
        return item['media:content']['$'].url;
    }
    if (item.enclosure && item.enclosure.url) {
        return item.enclosure.url;
    }
    const contentToSearch = item['content:encoded'] || item.content || item.description || '';
    if (contentToSearch) {
        const imgMatch = contentToSearch.match(/<img[^>]+src="([^">]+)"/);
        if (imgMatch) {
            return imgMatch[1];
        }
    }
    return null;
}


module.exports = async (req, res) => {
    
    let allItems = [];
    const siteTitle = 'US News Aggregator'; // Judul utama hanya "US News Aggregator"
    
    for (const feedConfig of RSS_FEEDS) {
        try {
            const feed = await parser.parseURL(feedConfig.url);
            const itemsToAdd = feed.items.slice(0, 10).map(item => ({
                ...item,
                source: feedConfig.title,
                imageUrl: findImage(item) 
            }));
            allItems.push(...itemsToAdd);
        } catch (error) {
            console.error(`Failed to load feed: ${feedConfig.title}`);
        }
