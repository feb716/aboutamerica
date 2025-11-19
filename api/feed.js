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
    if (item['media:content'] && item['media:content']['$'] && item['media:content']['$'].url) {
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
    const siteTitle = 'US News Aggregator: Fox & NYT';
    
    for (const feedConfig of RSS_FEEDS) {
        try {
            const feed = await parser.parseURL(feedConfig.url);
            // Get 10 items from each source for a longer scroll
            const itemsToAdd = feed.items.slice(0, 10).map(item => ({
                ...item,
                source: feedConfig.title,
                imageUrl: findImage(item) 
            }));
            allItems.push(...itemsToAdd);
        } catch (error) {
            console.error(`Failed to load feed: ${feedConfig.title}`);
        }
    }

    // Prepare HTML Content
    let htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${siteTitle}</title>
            <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
            <style>
                body { 
                    font-family: 'Roboto', sans-serif; 
                    background-color: #f4f7f9; 
                    color: #333;
                    line-height: 1.6;
                    margin: 0;
                    padding: 0;
                }
                .container {
                    max-width: 800px; 
                    margin: 0 auto; 
                    padding: 0 0 20px 0; /* Padding top and bottom only */
                    background-color: #fff;
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                }
                header {
                    background-color: #004d99; 
                    color: white;
                    padding: 20px 0;
                    margin-bottom: 0; 
                    text-align: center;
                }
                header h1 {
                    margin: 0;
                    font-size: 2.5em;
                    font-weight: 700;
                }

                /* ----- CODE FOR HORIZONTAL SCROLL ----- */
                .news-scroll {
                    display: flex;
                    overflow-x: scroll; /* Enable side-to-side scrolling */
                    padding: 20px 10px; /* Padding around the scroll area */
                    gap: 15px; /* Spacing between items */
                    -webkit-overflow-scrolling: touch; 
                }
                
                .item { 
                    flex-shrink: 0; 
                    width: 250px; /* Set fixed width for better mobile viewing */
                    height: auto;
                    border: 1px solid #e0e0e0; 
                    padding: 15px; 
                    margin: 0; 
                    border-radius: 8px; 
                    display: flex; 
                    flex-direction: column; 
                    background-color: #ffffff;
                    transition: box-shadow 0.3s ease;
                }
                .item:hover {
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                }
                
                .image-container { 
                    width: 100%; 
                    height: 140px; /* Slightly taller image for better focus */
                    margin-bottom: 10px;
                }
                .image-container img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover; 
                    border-radius: 5px;
                }
                /* -------------------------------------- */
                
                .item h3 { margin-top: 0; margin-bottom: 5px;} 
                .item h3 a { 
                    color: #004d99; 
                    text-decoration: none; 
                    font-weight: 700;
                    font-size: 1.0em; /* Title Font Size */
                }
                .item h3 a:hover {
                    text-decoration: underline;
                }
                .source { 
                    font-size: 0.85em; 
                    color: #777; 
                    margin-top: 5px; 
                }
                .ad-slot-placeholder {
                    text-align: center;
                    margin: 30px 0;
                }
                footer {
                    text-align: center;
                    padding: 20px 0;
                    margin-top: 30px;
                    border-top: 1px solid #ccc;
                    font-size: 0.8em;
                    color: #999;
                }
            </style>
        </head>
        <body>
            <header>
                <h1>${siteTitle}</h1>
            </header>
            <div class="container">
                
                <div class="ad-slot-placeholder">
                    </div>
                <div class="news-scroll">

    `;

    // Loop to display all content
    if (allItems.length === 0) {
        htmlContent += '<p style="padding: 0 20px;">Currently no news available to load.</p>';
    } else {
        allItems.forEach((item, index) => {
            const imageHtml = item.imageUrl 
                ? `<div class="image-container"><img src="${item.imageUrl}" alt="${item.title}" loading="lazy"></div>` 
                : ''; 
            
            htmlContent += `
                <div class="item">
                    ${imageHtml}
                    <div class="text-content">
                        <h3><a href="${item.link}" target="_blank">${item.title}</a></h3>
                        <div class="source">
                            Source:
