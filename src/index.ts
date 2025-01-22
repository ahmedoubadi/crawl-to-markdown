import puppeteer, { Page, Browser } from 'puppeteer';

type SEARCH_ENGINE = 'google';

export class MarkdownCrawler {
    browser: Browser | undefined;
    headless: boolean = false;
    constructor(_headless: boolean) {
        this.headless = _headless;
    }

    async crawlFromUrl(
        url: string,
    ): Promise<{ markdown: string; status: number }> {
        if (!this.isValidUrl(url)) {
            throw new Error(
                'Invalid URL provided, should be a full URL starting with http:// or https://',
            );
        }

        if (!(await this.ensureBrowser())) {
            throw new Error('Could not start browser instance');
        }

        return this.crawlSingleWebsite(url);
    }
    async crawlFromKeyword(
        keyword: string,
        search_engine: SEARCH_ENGINE,
    ): Promise<{ markdown: string; url: string }[]> {
        if (typeof keyword !== 'string') {
            throw new Error('Invalid Keyword provided, should be a string');
        }

        if (search_engine !== 'google') {
            throw new Error(
                'only google search engine is supported at the moment',
            );
        }
        if (!(await this.ensureBrowser())) {
            throw new Error('Could not start browser instance');
        }

        const urls = await this.crawlSearchEngine(keyword);
        if (urls.length > 0) {
            return await this.crawllMultipleWebsite(urls);
        } else {
            throw new Error("Couldn't crawl for this keyword");
        }
    }

    async ensureBrowser(): Promise<boolean> {
        let retries = 3;
        while (retries) {
            if (!this.browser || !this.browser.connected) {
                try {
                    this.browser = await puppeteer.launch({
                        headless: this.headless,
                    });
                    return true;
                } catch (e) {
                    console.error(
                        `Browser DO: Could not start browser instance. Error: ${e}`,
                    );
                    retries--;
                    if (!retries) {
                        return false;
                    }

                    console.log(
                        `Retrying to start browser instance. Retries left: ${retries}`,
                    );
                }
            } else {
                return true;
            }
        }
        return false;
    }
    async crawlSearchEngine(keyword: string): Promise<string[]> {
        const page = await this.browser!.newPage();
        await page.goto('https://www.google.com');
        await page.type('textarea[name=q]', keyword);
        await Promise.all([
            page.waitForNavigation(),
            await page.keyboard.press('Enter'), // Action that causes navigation
        ]);

        // Function to scroll the page
        const scrollToBottom = async (): Promise<void> => {
            await page.evaluate(async () => {
                // Scroll down to the bottom of the page
                window.scrollTo(0, document.body.scrollHeight);
                // Wait for new content to load
                await new Promise((resolve) => setTimeout(resolve, 2000));
            });
        };

        let previousHeight;
        let currentHeight = await page.evaluate(
            () => document.body.scrollHeight,
        );

        while (true) {
            previousHeight = currentHeight;
            await scrollToBottom();
            currentHeight = await page.evaluate(
                () => document.body.scrollHeight,
            );

            // Break if we reached the bottom of the page
            if (currentHeight === previousHeight) {
                break;
            }
        }

        const searchResults = await page.evaluate(() => {
            const results = [];
            const items = document.querySelectorAll('h3');
            for (let i = 0; i < items.length; i++) {
                const titleElement = items[i];
                if (titleElement) {
                    const link = titleElement.closest('a');
                    results.push({
                        title: titleElement.innerText,
                        url: link ? link.href : '',
                    });
                }
            }
            return results;
        });
        const urls = searchResults.map((search) => search.url);
        return urls;
    }
    async crawllMultipleWebsite(
        urls: string[],
    ): Promise<{ url: string; markdown: string }[]> {
        const mds = [];
        for (let index = 0; index < urls.length; index++) {
            const url = urls[index];
            try {
                const markdown = await this.fetchAndProcessPage(url);
                mds.push({ url, markdown });
                console.log(`${index + 1}/${urls.length} done, url : ${url}`);
            } catch (error) {
                console.error(
                    `${index + 1}/${urls.length} failed, url : ${url}`,
                );
            }
        }
        await this.browser?.close();
        return mds;
    }
    async crawlSingleWebsite(
        url: string,
    ): Promise<{ markdown: string; status: number }> {
        const md = await this.getWebsiteMarkdown({
            urls: [url],
        });
        await this.browser?.close();
        return {
            markdown: md[0]?.markdown,
            status: 200,
        };
    }

    async extractLinks(page: Page, baseUrl: string): Promise<string[]> {
        return await page.evaluate((baseUrl) => {
            return Array.from(document.querySelectorAll('a'))
                .map((link) => (link as { href: string }).href)
                .filter((link) => link.startsWith(baseUrl));
        }, baseUrl);
    }

    async getWebsiteMarkdown({ urls }: { urls: string[] }): Promise<
        {
            url: string;
            markdown: string;
        }[]
    > {
        const isBrowserActive = await this.ensureBrowser();

        if (!isBrowserActive) {
            throw new Error('Could not start browser instance');
        }

        return await Promise.all(
            urls.map(async (url) => {
                try {
                    const markdown = await this.fetchAndProcessPage(url);
                    return { url, markdown };
                } catch (error) {
                    console.error(error);
                    return { url, markdown: '' };
                }
            }),
        );
    }

    async fetchAndProcessPage(url: string): Promise<string> {
        const page = await this.browser!.newPage();
        await page.goto(url, { waitUntil: 'networkidle0' });
        const md = await page.evaluate(() => {
            function extractPageMarkdown(): string {
                const readabilityScript = document.createElement('script');
                readabilityScript.src =
                    'https://unpkg.com/@mozilla/readability/Readability.js';
                document.head.appendChild(readabilityScript);

                const turndownScript = document.createElement('script');
                turndownScript.src =
                    'https://unpkg.com/turndown/dist/turndown.js';
                document.head.appendChild(turndownScript);

                let md = 'no content';

                // Wait for the libraries to load
                md = Promise.all([
                    new Promise(
                        (resolve) => (readabilityScript.onload = resolve),
                    ),
                    new Promise((resolve) => (turndownScript.onload = resolve)),
                ]).then(() => {
                    // Turndown instance to convert HTML to Markdown
                    // @ts-ignore
                    const turndownService = new TurndownService();

                    const documentWithoutScripts = document.cloneNode(true);
                    /*if (!(documentWithoutScripts instanceof Element)) {
                        throw new Error('documentNode is not an Element');
                    }*/
                    documentWithoutScripts
                        // @ts-expect-error
                        .querySelectorAll('script')
                        .forEach((browserItem: any) => browserItem.remove());

                    documentWithoutScripts
                        // @ts-expect-error
                        .querySelectorAll('style')
                        .forEach((browserItem: any) => browserItem.remove());

                    documentWithoutScripts
                        // @ts-expect-error
                        .querySelectorAll('iframe')
                        .forEach((browserItem: any) => browserItem.remove());

                    documentWithoutScripts
                        // @ts-expect-error
                        .querySelectorAll('noscript')
                        .forEach((browserItem: any) => browserItem.remove());

                    // article content to Markdown
                    const markdown = turndownService.turndown(
                        documentWithoutScripts,
                    );

                    return markdown;
                }) as unknown as string;

                return md;
            }
            return extractPageMarkdown();
        });
        await page.close();
        return md;
    }
    isValidUrl(url: string): boolean {
        return /^(http|https):\/\/[^ "]+$/.test(url);
    }
}
