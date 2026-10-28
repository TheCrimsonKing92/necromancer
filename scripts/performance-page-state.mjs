export const collectPagePerformanceState = (page) =>
  page.evaluate(() => {
    const navigation = performance
      .getEntriesByType("navigation")[0]
      ?.toJSON();
    const resources = performance.getEntriesByType("resource");
    return {
      navigation,
      observed: window.__necromancerPerformance,
      resourceCount: resources.length,
      transferBytes: resources.reduce(
        (total, resource) => total + resource.transferSize,
        0,
      ),
      resources: resources.map((resource) => ({
        name: new URL(resource.name).pathname,
        transferSize: resource.transferSize,
        encodedBodySize: resource.encodedBodySize,
      })),
      domElements: document.querySelectorAll("*").length,
    };
  });
