(function(){
  "use strict";

  function runScriptsInPlace(container){
    var scripts = Array.prototype.slice.call(container.querySelectorAll("script"));

    return scripts.reduce(function(promise, oldScript){
      return promise.then(function(){
        return new Promise(function(resolve, reject){
          var newScript = document.createElement("script");

          Array.prototype.slice.call(oldScript.attributes).forEach(function(attr){
            newScript.setAttribute(attr.name, attr.value);
          });

          if (oldScript.src) {
            newScript.onload = resolve;
            newScript.onerror = reject;
            newScript.src = oldScript.src;
          } else {
            newScript.textContent = oldScript.textContent;
          }

          if (oldScript.parentNode) {
            oldScript.parentNode.replaceChild(newScript, oldScript);
          }

          if (!oldScript.src) {
            resolve();
          }
        });
      });
    }, Promise.resolve());
  }

  function notifyArchiveLoaded(mount){
    try {
      document.dispatchEvent(new CustomEvent("jsl:external-archive-loaded", {
        detail: { mount: mount }
      }));
    } catch(e) {}

    /*
      Important pour Squarespace et tes scripts existants :
      on simule un rechargement interne de page après injection.
    */
    try {
      document.dispatchEvent(new Event("sqs:page:load"));
    } catch(e) {}

    try {
      document.dispatchEvent(new Event("mercury:load"));
    } catch(e) {}

    try {
      window.dispatchEvent(new Event("resize"));
    } catch(e) {}
  }

  function loadExternalArchive(mount){
    if (!mount || mount.dataset.jslLoaded === "1") return;

    var src = mount.getAttribute("data-jsl-external-src");
    if (!src) return;

    mount.dataset.jslLoaded = "1";
    mount.innerHTML = '<div style="padding:24px;text-align:center;font-family:Overpass,Arial,sans-serif;font-size:13px;">Loading archive…</div>';

    fetch(src, { cache: "no-store" })
      .then(function(response){
        if (!response.ok) {
          throw new Error("Cannot load archive: " + response.status + " " + response.statusText);
        }
        return response.text();
      })
      .then(function(html){
        mount.innerHTML = html;

        return runScriptsInPlace(mount).then(function(){
          notifyArchiveLoaded(mount);
        });
      })
      .catch(function(error){
        console.error("[JSL external archive loader]", error);
        mount.innerHTML =
          '<div style="padding:24px;text-align:center;font-family:Overpass,Arial,sans-serif;font-size:13px;color:#b40000;">Archive could not be loaded. Check Console.</div>';
      });
  }

  function initExternalArchives(){
    document.querySelectorAll("[data-jsl-external-src]").forEach(loadExternalArchive);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initExternalArchives);
  } else {
    initExternalArchives();
  }

  document.addEventListener("sqs:page:load", initExternalArchives);
  document.addEventListener("mercury:load", initExternalArchives);
  window.addEventListener("pageshow", initExternalArchives);

})();