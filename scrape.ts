import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs';

interface Project {
  image: string;
  name: string;
  link: string;
  description: string;
  author: string;
}

const scrapeProjects = async (): Promise<void> => {
  const browser: Browser = await puppeteer.launch({ headless: false });
  const page: Page = await browser.newPage();
  const url: string = 'https://based-latam.devfolio.co/projects';
  await page.goto(url);

  try {
    await page.waitForSelector('.ProjectCard__StyledFlex-sc-ffb1cab2-4', { timeout: 50000 });
    console.log('Initial project elements loaded');
  } catch (error) {
    console.log('Initial project elements not found or timed out');
  }

  const getProjectCount = async (): Promise<number> => {
    return await page.evaluate(() => 
      document.querySelectorAll('.ProjectCard__StyledFlex-sc-ffb1cab2-4').length
    );
  };

  const autoScroll = async (): Promise<void> => {
    console.log('Starting auto-scroll process...');
    let previousHeight = 0;
    let noChangeCount = 0;
    const maxNoChangeCount = 5;
    
    while (noChangeCount < maxNoChangeCount) {
      const currentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      
      if (currentHeight === previousHeight) {
        noChangeCount++;
        console.log(`No new content loaded, attempt ${noChangeCount}/${maxNoChangeCount}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        noChangeCount = 0;
        console.log(`New content found. Current project count: ${await getProjectCount()}`);
      }
      
      previousHeight = currentHeight;
      await page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    console.log('Finished scrolling, all content should be loaded');
  };

  await autoScroll();
  await new Promise(resolve => setTimeout(resolve, 3000));

  const projects: Project[] = await page.evaluate(() => {
    const projectElements = document.querySelectorAll('.ProjectCard__StyledFlex-sc-ffb1cab2-4');
    if (projectElements.length === 0) return [];
    
    return Array.from(projectElements).map((project): Project => {
      const image = (project.querySelector('img[alt="Project Image"]') as HTMLImageElement)?.src || 'Image not found';
      const name = (project.querySelector('.ProjectCard__AnchorContainer-sc-ffb1cab2-0 a') as HTMLAnchorElement)?.textContent?.trim() || 'Name not found';
      const link = (project.querySelector('.ProjectCard__AnchorContainer-sc-ffb1cab2-0 a') as HTMLAnchorElement)?.href || 'Link not found';
      const description = (project.querySelector('.sc-dkzDqf.gWbMTA') as HTMLElement)?.textContent?.trim() || 'Description not found';
      const author = (project.querySelector('.ProjectCard__BuilderText-sc-ffb1cab2-1') as HTMLElement)?.textContent?.trim() || 'Author not found';
      return { image, name, link, description, author };
    });
  });

  console.log(`Total projects scraped: ${projects.length}`);
  console.log(`First few projects: ${JSON.stringify(projects.slice(0, 3), null, 2)}`);

  fs.writeFileSync('latamprojects.json', JSON.stringify(projects, null, 2));
  console.log('Data saved to latamprojects.json');

  await browser.close();
};

scrapeProjects();
