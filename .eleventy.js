require("dotenv").config();

const { BlogService } = require("matrix-blog");
const { getMatrixClient } = require("./matrix");
const { DateTime } = require("luxon");
const sass = require("sass");
const CleanCSS = require("clean-css");
const fs = require("fs-extra");
const _ = require("lodash");

const matrixClient = getMatrixClient();
const blogService = new BlogService(matrixClient);

module.exports = function (config) {
  config.addCollection("posts", async (collection) => {
    const posts = await blogService.getFullPosts(
      process.env.MATRIX_BLOG_ROOM_ID
    );

    return _.chain(posts)
      .filter((p) => p.slug)
      .map((p) =>
        Object.assign(p, {
          url: `/${p.slug}/`,
          date: DateTime.fromMillis(p.created_ms, { zone: "UTC" }).toJSDate(),
          editDate:
            p.edited_ms &&
            DateTime.fromMillis(p.edited_ms, { zone: "UTC" }).toJSDate(),
          roomAlias: blogService.createRoomAlias(p.slug),
        })
      )
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
