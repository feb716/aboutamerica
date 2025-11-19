// File: api/feed.js

const Parser = require('rss-parser');
const parser = new Parser({
    // Setel parser pikeun ngolah namespace gambar média
    customFields: {
        item: ['media:content', 'enclosure', 'content:encoded', 'description'] 
    },
    headers: { 'User-Agent': 'Custom US News Aggregator Bot' }
});

// DAPTAR SUMBER BERITA US AYEUNA (Fox US, NYT)
const RSS_FEEDS = [
    { title: 'Fox News - Paling Populer (US)', url: 'https://feeds.foxnews.com/foxnews/most-popular' },
    { title: 'The New York Times - Berita Utama', url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml' } 
];

// FUNGSI: Nyobaan milarian link gambar
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
            // Urang tinggalkeun 20 item (10 ti unggal sumber) pikeun scroll anu panjang
            const itemsToAdd = feed.items.slice(0, 10).map(item => ({
                ...item,
                source: feedConfig.title,
                imageUrl: findImage(item) 
            }));
            allItems.push(...itemsToAdd);
        } catch (error) {
            console.error(`Gagal memuat feed: ${feedConfig.title}`);
        }
    }

    // Urang henteu peryogi diurutkeun dumasar tanggal dina tampilan horizontal
    // allItems.sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate)); 

    // Nyiapkeun Konten HTML
    let htmlContent = `
        <!DOCTYPE html>
        <html lang="id">
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
                    padding: 0 0 20px 0; /* Padding luhur jeung handap wungkul */
                    background-color: #fff;
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                }
                header {
                    background-color: #004d99; 
                    color: white;
                    padding: 20px 0;
                    margin-bottom: 0; /* Hapus margin handap */
                    text-align: center;
                }
                header h1 {
                    margin: 0;
                    font-size: 2.5em;
                    font-weight: 700;
                }

                /* ----- KODE ANYAR UNTUK SCROLL HORIZONTAL ----- */
                .news-scroll {
                    display: flex;
                    overflow-x: scroll; /* Kunci scrolling ka gigir */
                    padding: 20px 10px; /* Padding di sabudeureun scroll */
                    gap: 15px; /* Spasi antar item */
                    -webkit-overflow-scrolling: touch; /* Pangalusna pikeun sélulér */
                }
                
                .item { 
                    flex-shrink: 0; /* Pastikeun item teu ciut */
                    width: 300px; /* Lebar item dibereskeun */
                    height: auto;
                    border: 1px solid #e0e0e0; 
                    padding: 15px; 
                    margin: 0; 
                    border-radius: 8px; 
                    display: flex; 
                    flex-direction: column; /* Kontén ka handap */
                    background-color: #ffffff;
                    transition: box-shadow 0.3s ease;
                }
                .item:hover {
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                }
                
                .image-container { 
                    width: 100%; /* Gambar full width dina item */
                    height: 150px;
                    margin-bottom: 10px;
                }
                .image-container img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover; 
                    border-radius: 5px;
                }
                /* ------------------------------------------------ */
                
                .item h3 { margin-top: 0; }
                .item h3 a { 
                    color: #004d99; 
                    text-decoration: none; 
                    font-weight: 700;
                    font-size: 1.1em;
                }
                .item h3 a:hover {
                    text-decoration: underline;
                }
                .source { 
                    font-size: 0.85em; 
                    color: #777; 
                    margin-top: 8px; 
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
                
                <div class="
