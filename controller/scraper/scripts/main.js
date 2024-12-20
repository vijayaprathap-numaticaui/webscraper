//for env load
(() => {
  const envPath = path.resolve(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;

  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, value] = line.split("=");
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
})();

const baseUrl = "https://www.webstaurantstore.com";
const weightRegex = /(\d+(?:\.\d+)?)\s*(oz|lb)/i;
const priceRegex = /(\$[\d,]+\.\d{2})\s*<span[^>]*>(.*?)<\/span>/;

const SCRAPERAPI_KEY = "10bd20b3a17380362aa065fa3efe76f2";
const TARGET_URL =
  "https://www.webstaurantstore.com/68221/whole-bean-coffee-espresso.html";

const getApiUrl = (page) => {
  const apiUrl = `http://api.scraperapi.com/?api_key=${SCRAPERAPI_KEY}&url=${TARGET_URL}?page=${page}&render=true`;
  return apiUrl;
};

const fetchWithRetry = async (url, retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
      });

      if (response.status === 401) {
        throw new Error("Unauthorized! Check your API token.");
      }

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const html = await response.text();

      if (/Access Denied|Suspicious Activity/i.test(html)) {
        fs.writeFileSync("error_response.html", html);
        throw new Error("Bot protection detected or access denied.");
      }

      return html;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed: ${error.message}`);
      if (i === retries - 1) {
        fs.writeFileSync("final_error_log.txt", `Error: ${error.message}`);
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
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
    const websiteData = JSON.parse(process.argv[2]); 
    console.log("Received websiteData:", websiteData);
    let page = 1;
    let count = 0;
    let allProducts = [];

    const apiUrl = getApiUrl(page);
    console.log("apiUrl", apiUrl);

  
    const html = await fetchWithRetry(apiUrl);
    const { products, productCount } = convertHtmlToJson(html);

    if (products?.length) {
      allProducts = products;
    }

    if (productCount === 100) {
      do {
        page++;
        console.log("Fetching page", page);
        const apiUrl = getApiUrl(page);
        console.log("apiUrl", apiUrl);

        const html = await fetchWithRetry(apiUrl);
        const { productCount, products: newProducts } = convertHtmlToJson(html);

        if (newProducts?.length) {
          count = productCount;
          allProducts = [...allProducts, ...newProducts];
        } else {
          count = 0;
        }
      } while (count === 100);
    }

    fs.writeFile("data.json", JSON.stringify(allProducts, null, 2), (err) => {
      if (err) throw err;
      console.log("The file has been saved!");
    });

    console.log("Fetched all products:", allProducts.length);
  } catch (error) {
    console.error("Error fetching or parsing data:", error);
  }
})();
