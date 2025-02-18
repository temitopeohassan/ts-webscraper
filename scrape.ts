import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs';

interface Course {
  courseCode: string;
  title: string;
  link: string;
  instructor: string;
  academicYear: string;
  quarter: string;
  days: string;
  startTime: string;
  endTime: string;
}

const scrapeCourses = async (): Promise<void> => {
  const browser: Browser = await puppeteer.launch({ headless: false });
  const page: Page = await browser.newPage();
  const url: string = 'https://history.stanford.edu/academics/current-courses'; // Replace with actual URL
  await page.goto(url);

  try {
    await page.waitForSelector('.hb-table-row', { timeout: 50000 });
    console.log('Initial course elements loaded');
  } catch (error) {
    console.log('Initial course elements not found or timed out');
  }

  const getCourseCount = async (): Promise<number> => {
    return await page.evaluate(() => 
      document.querySelectorAll('.hb-table-row').length
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
        console.log(`New content found. Current course count: ${await getCourseCount()}`);
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

  const courses: Course[] = await page.evaluate(() => {
    const courseElements = document.querySelectorAll('.hb-table-row');
    if (courseElements.length === 0) return [];
    
    return Array.from(courseElements).map((row): Course => {
      const courseCode = (row.querySelector('.views-field-field-hs-course-code .field-content')?.textContent?.trim() || 'N/A') as string;
      const titleElement = row.querySelector('.views-field-title a');
      const title = (titleElement?.textContent?.trim() || 'N/A') as string;
      const link = (titleElement ? titleElement.getAttribute('href') : 'N/A') as string;
      const instructor = (row.querySelector('.views-field-field-hs-course-section-instruc .field-content')?.textContent?.trim() || 'N/A') as string;
      const academicYear = (row.querySelector('.views-field-field-hs-course-academic-year .field-content')?.textContent?.trim() || 'N/A') as string;
      const quarter = (row.querySelector('.views-field-field-hs-course-section-quarter .field-content')?.textContent?.trim() || 'N/A') as string;
      const days = (row.querySelector('.views-field-field-hs-course-section-days .field-content')?.textContent?.trim() || 'N/A') as string;
      const startTime = (row.querySelector('.views-field-field-hs-course-section-st-time .field-content')?.textContent?.trim() || 'N/A') as string;
      const endTime = (row.querySelector('.views-field-field-hs-course-section-end-time .field-content')?.textContent?.trim() || 'N/A') as string;

      return { courseCode, title, link, instructor, academicYear, quarter, days, startTime, endTime };
    });
  });

  console.log(`Total courses scraped: ${courses.length}`);
  console.log(`First few courses: ${JSON.stringify(courses.slice(0, 3), null, 2)}`);

  fs.writeFileSync('courses.json', JSON.stringify(courses, null, 2));
  console.log('Data saved to courses.json');

  await browser.close();
};

scrapeCourses();
