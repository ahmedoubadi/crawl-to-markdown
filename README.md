# Crawl-to-Markdown

**Crawl-to-Markdown** is a TypeScript package designed to search search engines for a given keyword, crawl the resulting websites, and return their content in Markdown format. It can also directly crawl specified websites, making it a versatile tool for content extraction, documentation, or SEO analysis.

## Features

-   Search search engines for keywords and crawl the results.
-   Crawl websites directly by providing URLs.
-   Extract web content and deliver it in markdown format.
-   Ideal for developers, content creators, and SEO specialists.
-   Built-in support for structured data extraction.

## Installation

Install the package via npm:

```bash
npm install crawl-to-markdown
```

## Usage

### 1. Crawl Search Engine Results for a Given Keyword

You can provide a keyword, and the package will search the web and crawl the top results, returning the content in markdown format:

```typescript
import { MarkdownCrawler } from 'crawl-to-markdown';

const keyword = 'How to outperform your self';
const crawler = new MarkdownCrawler(true);
const result = await crawler.crawlFromKeyword(keyword, 'google');
```

### 2. Crawl a Specific Website

If you want to crawl a specific website and extract its content:

```typescript
import { MarkdownCrawler } from 'crawl-to-markdown';

const url = 'https://example.com';
const crawler = new MarkdownCrawler(true);
const result = await crawler.crawlFromUrl(url);
```

## API

### `crawlFromKeyword(keyword: string): Promise<string>`

-   **keyword**: A keyword to search in search engines.
-   Returns a promise that resolves to the markdown content extracted from the top search results.

### `crawlFromUrl(url: string): Promise<string>`

-   **url**: A specific website URL to crawl.
-   Returns a promise that resolves to the markdown content of the crawled webpage.

## Example Output

Here’s an example of what the markdown output might look like:

```markdown
# Example Website Title

## Introduction

This is an example content scraped from the website.

## Section 1: Overview

Details about the first section...

## Conclusion

Final thoughts and summary...
```

## License

This project is licensed under the MIT License. See the `LICENSE` file for more details.
