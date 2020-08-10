const puppeteer = require('puppeteer')
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({ headless: false })
    const page = await browser.newPage()
    await page.goto('https://ondras.github.io/primitive.js/', { waitUntil: 'networkidle0' })

    const files = fs.readdirSync('2020/full')
    for (let i = 0; i < files.length; i++) {
        console.log(files[i])
        if (fs.existsSync(`2020/svg/${files[i].split('.').slice(0, -1).join('.') + '.svg'}`)) continue
        let input = await page.$('input[type=file]')
        await input.uploadFile(`2020/full/${files[i]}`)
        await page.$eval('input[name=steps]', el => el.value = 200);
        await page.click('input[type=submit]')
        await page.click('input[value=vector]')
        await page.waitForFunction(`document.getElementById("steps").innerText.startsWith("(200 of 200")`)
        const svg = await page.evaluate(elm => elm.value, await page.$('#vector-text'));
        fs.writeFileSync(`2020/svg/${files[i].split('.').slice(0, -1).join('.') + '.svg'}`, svg)
    }

    await browser.close()
})();