const cheerio = require('cheerio');
const ppteer = require('puppeteer');
require('dotenv').config();

const dateFrom = '01.03.2022';
const dateTo = '30.09.2022';

(async () => {
  const browser = await ppteer.launch({
    headless: true,
    defaultViewport: {
      width: 1920,
      height: 1080,
      isMobile: false,
    },
    args: ['--no-sandbox']
  });

  const pg = await browser.newPage();
  await pg.goto('https://edziekanat.zut.edu.pl/WU/PodzGodzin.aspx');

  // Switch to english
  await pg.waitForSelector('#page_content_inner > #page_middle_content > #settings_panel > #page_language > .language_en');
  pg.click('#page_content_inner > #page_middle_content > #settings_panel > #page_language > .language_en');
  await pg.waitForNavigation();

  // Login & get redirected to schedule page
  await pg.type('#ctl00_ctl00_ContentPlaceHolder_MiddleContentPlaceHolder_txtIdent', process.env.LOGIN);
  await pg.type('#ctl00_ctl00_ContentPlaceHolder_MiddleContentPlaceHolder_txtHaslo', process.env.PASS);
  pg.click('#ctl00_ctl00_ContentPlaceHolder_MiddleContentPlaceHolder_butLoguj');
  await pg.waitForNavigation();

  // Insert dates & and click filter button
  await pg.type('#ctl00_ctl00_ContentPlaceHolder_RightContentPlaceHolder_radDataOd_dateInput', dateFrom);
  await pg.type('#ctl00_ctl00_ContentPlaceHolder_RightContentPlaceHolder_radDataDo_dateInput', dateTo);
  pg.click('#ctl00_ctl00_ContentPlaceHolder_RightContentPlaceHolder_btnFiltruj');
  await pg.waitForNavigation();

  // Get the number of classes in given date range
  const classHTML = await pg.evaluate(() => { return { html: document.documentElement.innerHTML } });
  const obecArr = classHTML.html.match(/(lb_Obecnosc[0-9]{1,3})/g);
  console.log("Number of classes in given date: " + (obecArr.length - 1) + "\n");

  let course;
  let date;
  let presence;
  let formOfClasseses;

  for (let i = 0; i <= obecArr.length - 1; i++) {
    pg.click('#lb_Obecnosc' + i);
    await pg.waitForNavigation();
    let pgData = await pg.evaluate(() => { return { html: document.documentElement.innerHTML }; })
    let $ = cheerio.load(pgData.html);
    course = $('#ctl00_ctl00_ContentPlaceHolder_RightContentPlaceHolder_Label1');
    presence = $('#ctl00_ctl00_ContentPlaceHolder_RightContentPlaceHolder_RadGrid1_ctl00__0 > td:nth-child(4)');
    date = $('#ctl00_ctl00_ContentPlaceHolder_RightContentPlaceHolder_Label5');
    formOfClasseses = $('#ctl00_ctl00_ContentPlaceHolder_RightContentPlaceHolder_Label7');

    // Write to console each absence
    if (presence.text() == "Nieobecny") {
      console.log(course.text() + "\n" + formOfClasseses.text() + "\n" + presence.text() + "\n" + date.text() + "\n");
    }

    // Loop
    await pg.goto('https://edziekanat.zut.edu.pl/WU/PodzGodzin.aspx');
    await pg.type('#ctl00_ctl00_ContentPlaceHolder_RightContentPlaceHolder_radDataOd_dateInput', dateFrom);
    await pg.type('#ctl00_ctl00_ContentPlaceHolder_RightContentPlaceHolder_radDataDo_dateInput', dateTo);
    pg.click('#ctl00_ctl00_ContentPlaceHolder_RightContentPlaceHolder_btnFiltruj');
    await pg.waitForNavigation();
  }
  console.log("\nDone!");

  await browser.close();
})();