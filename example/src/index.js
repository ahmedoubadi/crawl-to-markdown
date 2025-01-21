import { MarkdownCrawler } from 'crawl-to-markdown';
import fs from 'fs';
const crawler = new MarkdownCrawler(true);
const url =
    'https://stackoverflow.com/questions/44515865/package-that-is-linked-with-npm-link-doesnt-update';
try {
    const response = await crawler.crawlFromUrl(url);
    try {
        fs.writeFileSync('./result.md', response.markdown, 'utf8');
    } catch (error) {
        console.log("couldn't write to the file", error);
    }
} catch (error) {
    console.error(error);
}
