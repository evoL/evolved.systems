require("dotenv").config();

const { BlogService } = require("matrix-blog");
const { getMatrixClient } = require("./matrix");
const { DateTime } = require("luxon");
const sass = require("sass");
const CleanCSS = require("clean-css");
const fs = require("fs-extra");

const matrixClient = getMatrixClient();
const blogService = new BlogService(matrixClient);

module.exports = function (config) {
  config.addCollection("posts", async (collection) => {
    const posts = await blogService.getFullPosts(
      process.env.MATRIX_BLOG_ROOM_ID
    );

    return posts
      .filter((p) => p.slug)
      .map((p) =>
        Object.assign(p, {
          url: `/${p.slug}/`,
          date: DateTime.fromMillis(p.created_ms, { zone: "UTC" }).toISO(),
          editDate:
            p.edited_ms &&
            DateTime.fromMillis(p.edited_ms, { zone: "UTC" }).toISO(),
        })
      );
  });

  // Copy static assets
  config.addPassthroughCopy("static");

  // Compile Sass on build
  config.on("beforeBuild", () => {
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
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      markdownTemplateEngine: "njk",
    },
  };
};
