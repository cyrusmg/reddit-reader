const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');

const readline = require('readline');

const main = async () => {
  const res = await fetch('https://i.reddit.com/r/onebag/');
  const text = await res.text()

  fs.writeFileSync('onebag.html', text);

  const $ = cheerio.load(fs.readFileSync('onebag.html'));

  // remove sticky posts
  $('.sitetable .stickied').each((i, e) => { $(e).remove() });

  const posts = [];
  // print non-sticky posts with upvotes
  $('.sitetable .link').each((i, e) => {
    posts.push({
      title: $(e).find('.title a').text(),
      upvotes: $(e).find('span .unvoted').text(),
    });
  });
  console.log(posts);
};

main();

