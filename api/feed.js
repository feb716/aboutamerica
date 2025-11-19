// File: api/feed.js

const Parser = require('rss-parser');
const parser = new Parser({
    // Set parser to handle media image namespaces
    customFields: {
        item: ['media:content', 'enclosure', 'content:encoded', 'description'] 
    },
    headers: { 'User-Agent': 'US News' }
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
    const siteTitle = 'American News';
    
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
            <meta name="monetag" content="1b949bb2ec11c7b38b30da69aacf4401">
            <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
            <style>
                body { 
                    font-family: 'Roboto', sans-serif; 
                    background-color: #000000; 
                    color: #ffffff; 
                    line-height: 1.6;
                    margin: 0;
                    padding: 0;
                }
                .container {
                    max-width: 800px; 
                    margin: 0 auto; 
                    padding: 20px;
                    padding-bottom: 30px; 
                    background-color: #000000; 
                    box-shadow: 0 0 10px rgba(255,255,255,0.1); 
                }
                header {
                    background-image: url('/uslogo.jpg'); 
                    background-size: cover; 
                    background-position: center; 
                    color: white;
                    padding: 20px 0;
                    margin-bottom: 0px; 
                    text-align: center;
                    
                    position: relative; 
                    z-index: 1; 
                }
                header::before {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5); 
                    z-index: 0; 
                }
                header h1 {
                    position: relative;
                    z-index: 2;
                    margin: 0;
                    font-size: 2.5em;
                    font-weight: 700;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.7); 
                }
                .item { 
                    border: 1px solid #333333; 
                    padding: 15px; 
                    margin-bottom: 25px; 
                    border-radius: 8px; 
                    display: flex; 
                    gap: 15px; 
                    background-color: #000000; 
                    transition: box-shadow 0.3s ease;
                }
                .item:hover {
                    box-shadow: 0 4px 15px rgba(255, 255, 255, 0.25); 
                }
                .item h3 { margin-top: 0; margin-bottom: 5px; } 
                .item h3 a { 
                    color: #ffffff; 
                    text-decoration: none; 
                    font-weight: 500; /* FINAL: Ketebalan font judul lebih lembut */
                    font-size: 1em; /* FINAL: Ukuran font judul lebih kecil */
                }
                .item h3 a:hover {
                    text-decoration: underline;
                }
                .source { 
                    font-size: 0.85em; 
                    color: #cccccc; 
                    margin-top: 5px; 
                }
                .image-container { 
                    flex-shrink: 0; 
                    width: 140px; 
                    height: 90px; 
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
                    border-top: 1px solid #555; 
                    font-size: 0.8em;
                    color: #cccccc; 
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
