const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');

const readline = require('readline');

const getSubredditPosts = async subreddit => {
  const res = await fetch(`https://i.reddit.com/r/${subreddit}/`);
  const text = await res.text()

  const $ = cheerio.load(text);

  // remove sticky posts
  $('.sitetable .stickied').each((i, e) => { $(e).remove() });

  const posts = [];
  // print non-sticky posts with upvotes
  $('.sitetable .link').each((i, e) => {
    posts.push({
      title: $(e).find('.title a').text(),
      upvotes: $(e).find('span .unvoted').text(),
      commentCount: $(e).find('.commentcount').text(),
      href: $(e).find('.title a').attr('href'),
    });
  });

  return posts;
}

const printHome = posts => {
  for (const [i, post] of posts.entries()) {
    console.log(`${String(i + 1).padStart(2, '0')}: ${post.title} (${post.commentCount})`);
  }
}

const getCommentWithChildren = ($, node) => {
  const children = [];

  $(node).find('> .sitetable > .comment').each((i, comment) => {
    const child = { children: [] };

    $(comment).find('> .entry > .usertext > .usertext-body').each((i, e) => {
      child.text = $(e).text();
    });

    $(comment).find('> .child').each((i, e) => {
      child.children.push(...getCommentWithChildren($, e));
    });

    children.push(child);
  });

  return children;
}

const getComments = async href => {
  const res = await fetch(href);
  const text = await res.text()

  const $ = cheerio.load(text);

  const comments = {
    text: $('.expando .usertext-body').text(),
    children: [],
  };

  $('.commentarea').each((i, comment) => {
    comments.children.push(...getCommentWithChildren($, comment));
  });

  return comments;
}

const printCommentString = (text, depth) => {
  const parts = text
    .replace(/^\n+/, '')
    .replace(/\n\n+/g, '')
    .replace(/\n+$/, '')
    .replace(/(.{64}[^\s]+)/g,'$1\n')
    .split('\n')
  console.log((' |').repeat(depth), '-'.repeat(80-depth*2))
  for (const part of parts) {
    console.log((' |').repeat(depth), part);
  }
}

const printComments = (commentRoot, depth = 0) => {
  printCommentString(commentRoot.text, depth);
  for (const child of commentRoot.children) {
    printComments(child, depth + 1);
  }
}

const isNumber = str => !isNaN(parseInt(str));

const main = async subreddit => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const askQuestion = question => new Promise(resolve => rl.question(question, answer => resolve(answer)));

  const posts = await getSubredditPosts(subreddit);
  printHome(posts);

  let answer = null;
  while (answer !== 'q') {
    switch (answer) {
      case 'h':
        printHome(posts);
        break;
      default:
        {
          if (isNumber(answer)) {
            const comments = await getComments(posts[parseInt(answer) - 1].href);
            printComments(comments);
          }
        }
    }

    answer = await askQuestion('Stránka: ');
  }

  rl.close();

  rl.on('close', () => {
    console.log('\nDone');
    process.exit(0);
  });
};

const args = process.argv.slice(2);
if (args.length !== 1) {
  console.log('Usage: node index.js <subreddit>');
  process.exit(1);
}

main(args[0]);

