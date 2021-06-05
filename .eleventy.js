require("dotenv").config();

const { BlogService } = require("matrix-blog");
const { getMatrixClient } = require("./matrix");
const { DateTime } = require("luxon");
const sass = require("sass");
const CleanCSS = require("clean-css");
const fs = require("fs-extra");
const _ = require("lodash");
const cacheBuster = require("@mightyplow/eleventy-plugin-cache-buster");
const rssPlugin = require("@11ty/eleventy-plugin-rss");

const matrixClient = getMatrixClient();
const blogService = new BlogService(matrixClient);

module.exports = function (config) {
  config.addCollection("posts", async (collection) => {
    const posts = await blogService.getFullPosts(
      process.env.MATRIX_BLOG_ROOM_ID
    );

    return _.chain(posts)
      .filter((p) => p.slug)
      .map((p) => {
        const date = DateTime.fromMillis(p.published_ms, {
          zone: "UTC",
        }).toJSDate();
        const editDate =
          p.edited_ms &&
          p.edited_ms > p.published_ms &&
          DateTime.fromMillis(p.edited_ms, { zone: "UTC" }).toJSDate();

        return Object.assign(p, {
          url: `/${p.slug}/`,
          date,
          editDate,
          updatedDate: editDate || date,
          roomAlias: blogService.createRoomAlias(p.slug),
        });
      })
      .sortBy((post) => post.date)
      .reverse()
      .value();
  });

  config.addCollection("postsByYear", (collection) => {
    const posts = collection.getAll()[0].data.collections.posts;

    return _.chain(posts)
      .groupBy((post) => post.date.getFullYear())
      .toPairs()
      .value();
  });

  // Add support for RSS feeds
  config.addPlugin(rssPlugin);

  // Add a cache buster to CSS files
  config.addPlugin(cacheBuster({}));

  // Add date formatting filters
  config.addFilter("readableDate", (date) => {
    return DateTime.fromJSDate(date).toLocaleString(DateTime.DATE_FULL);
  });
  config.addFilter("isoDate", (date) => {
    return DateTime.fromJSDate(date).toISO();
  });

  // Copy static assets
  config.addPassthroughCopy("static");

  // Compile Sass on build
  config.addWatchTarget("src/css/");
  config.on("beforeBuild", () => {
    try {
      const result = sass.renderSync({
        file: "src/css/main.scss",
        sourceMap: false,
        outputStyle: "compressed",
      });

      const { styles } = new CleanCSS({}).minify(result.css);

      fs.outputFile("_site/css/main.css", styles, (err) => {
        if (err) throw err;
        console.log("Wrote optimized CSS to _site/css/main.css");
      });
    } catch (e) {
      console.error(e);
    }
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      markdownTemplateEngine: "njk",
    },
  };
};
