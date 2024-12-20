const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const {uploadOutputData} = require("../../../service/dbservice");

const loadEnv = () => {
  const envPath = path.resolve(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;

  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, value] = line.split("=");
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
};

loadEnv();

const baseUrl = "https://www.webstaurantstore.com";
const weightRegex = /(\d+(?:\.\d+)?)\s*(oz|lb)/i;
const priceRegex = /(\$[\d,]+\.\d{2})\s*<span[^>]*>(.*?)<\/span>/;
const apiKey = process.env.CRAWLBASE_API_KEY;

const getApiUrl = (page,websiteData) => {
  const {url} =  websiteData || {}
  const apiUrl = `https://api.crawlbase.com/?token=${apiKey}&url=${encodeURIComponent(
    url
  )}?page=${page}&render=true`;

  return apiUrl;
};

const fetchWithRetry = async (url, retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i === retries - 1) throw error;
    }
  }
};

const convertHtmlToJson = (html) => {
  const $ = cheerio.load(html);
  const products = [];
  const totalProducts = $(".product-box-container");

  totalProducts.each((_, element) => {
    const itemNumber = $(element).attr("data-item-number") || null;

    const title = $(element)
      .find('[data-testid="itemDescription"]')
      .text()
      .trim();

    const weight = title.match(weightRegex)?.[0] || "";

    const productUrl = $(element)
      .find('a[data-testid="itemLink"]')
      .attr("href");

    const imageSrcArray = [];
    $(element)
      .find(
        'img[data-testid="productBoxImage"], img[data-testid="productBoxImageSecondary"]'
      )
      .each((_, img) => {
        const src = $(img).attr("src");
        if (src) imageSrcArray.push(`${baseUrl}${src}`);
      });

    const priceElement = $(element).find('[data-testid="price"]').html();
    if (priceElement) {
      const rawPrice = priceElement.trim();
      const priceMatch = rawPrice.match(priceRegex);

      if (priceMatch) {
        const price = priceMatch[1];

        products.push({
          id: itemNumber ? itemNumber.toUpperCase() : "",
          title,
          weight,
          price,
          productImages: imageSrcArray,
          productUrl: productUrl ? `${baseUrl}${productUrl}` : "",
        });
      }
    }
  });

  return { productCount: totalProducts?.length, products };
};

(async () => {
  try {
    const websiteData = JSON.parse(process.argv[2]) || {}; // Parse the passed argument
    console.log("Received websiteData:", websiteData);
    let page = 1;
    let count = 0;
    let allProducts = [];
    const apiUrl = getApiUrl(page,websiteData);
    console.log("apiUrl", apiUrl);
    const html = await fetchWithRetry(apiUrl);
    const { products, productCount } = convertHtmlToJson(html);

    if (products?.length) {
      allProducts = products;
    }

    uploadOutputData(allProducts);

    console.log("all products", allProducts, allProducts?.length);
  } catch (error) {
    console.error("Error fetching or parsing data:", error);
  }
})();
