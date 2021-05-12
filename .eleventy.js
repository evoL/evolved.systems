require("dotenv").config();

const { BlogService } = require("matrix-blog");
const { getMatrixClient } = require("./matrix");
const { DateTime } = require("luxon");

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

  return {
    dir: {
      input: "src",
      output: "_site",
      markdownTemplateEngine: "njk",
    },
  };
};
