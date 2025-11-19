Pakai kode ini supaya tidak mengubah yang lain dan hanya mengubah logo :


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

    allItems.sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate));

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
                    padding: 20px;
                    padding-bottom: 30px; 
                    background-color: #fff;
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                }
                header {
                    background-color: #004d99; 
                    color: white;
                    padding: 20px 0;
                    margin-bottom: 0px; /* <--- INI PERBAIKANNYA: 0px dari 20px */
                    text-align: center;
                }
                header h1 {
                    margin: 0;
                    font-size: 2.5em;
                    font-weight: 700;
                }
                .item { 
                    border: 1px solid #e0e0e0; 
                    padding: 15px; 
                    margin-bottom: 25px; 
                    border-radius: 8px; 
                    display: flex; 
                    gap: 15px; 
                    background-color: #ffffff;
                    transition: box-shadow 0.3s ease;
                }
                .item:hover {
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                }
                .item h3 { margin-top: 0; margin-bottom: 5px; } 
                .item h3 a { 
                    color: #004d99; 
                    text-decoration: none; 
                    font-weight: 700;
                    font-size: 1.1em; /* Menggunakan font size 1.1em yang stabil */
                }
                .item h3 a:hover {
                    text-decoration: underline;
                }
                .source { 
                    font-size: 0.85em; 
                    color: #777; 
                    margin-top: 5px; 
                }
                .image-container { 
                    flex-shrink: 0; 
                    width: 140px; 
                    height: 90px; /* Menggunakan dimensi gambar yang lebih aman */
                }
                .image-container img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover; 
                    border-radius: 5px;
                }
                .text-content {
                    flex-grow: 1;
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
                `;

    // Loop to display all content
    if (allItems.length === 0) {
        htmlContent += '<p>Currently no news available to load.</p>';
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
                            Source: <strong>${item.source}</strong> | 
                            Published: ${new Date(item.isoDate).toLocaleString('en-US')}
                        </div>
                    </div>
                </div>
            `;
            
            if (index === 4) {
                 htmlContent += `
                    <div class="ad-slot-placeholder">
                        </div>
                    `;
            }
        });
    }

    // Close Container Div and Add Footer
    htmlContent += `
            </div> 
            <footer>
                &copy; ${new Date().getFullYear()} ${siteTitle}. News sources provided by Fox News and The New York Times.
            </footer>
            <script src="/_vercel/insights/script.js" defer></script> 
        </body>
        </html>
    `;

    // Set Vercel Cache Headers
    const CACHE_HEADER = 'public, s-maxage=3600, stale-while-revalidate=86400';

    res.setHeader('Cache-Control', CACHE_HEADER);
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(htmlContent);
};
