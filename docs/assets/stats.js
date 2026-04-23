import X3D         from "https://cdn.jsdelivr.net/npm/x_ite@latest/dist/x_ite.min.mjs";
import DataStorage from "./js/DataStorage.js";
import { $ }       from "https://cdn.jsdelivr.net/npm/jquery@4.0.0/dist-module/jquery.module.min.js";

// window .X3D = X3D;

const
   WIDTH  = 1,
   HEIGHT = 0.3;

class Stats
{
   static run ()
   {
      this .instance = new Stats ();
   }

   constructor ()
   {
      this .setup ();
   }

   async setup ()
   {
      // Query

      const url = new URL (location);

      this .username   = url .searchParams .get ("username");
      this .repository = url .searchParams .get ("repository");

      if (!this .username || !this .repository)
      {
         // Show username and repository inputs.

         $("main.inputs") .show ();

         $("main.inputs .submit") .on ("click", () =>
         {
            const
               username   = $("#username") .val (),
               repository = $("#repository") .val ();

            url .searchParams .set ("username",   username);
            url .searchParams .set ("repository", repository);

            window .location = url;
         });

         return;
      }

      // Configuration

      this .config = new DataStorage (localStorage, "jsDeliverStats.");

      this .config .setDefaultValues ({
         period: "quarter",
      });

      $("#period")
         .val (this .config .period)
         .on ("change", () => this .config .period = $("#period") .val ());

      // Charts

      $("main.stats") .show ();
      $("title") .text (`${this .username}/${this .repository} - ${$("title") .text ()}`);

      $("#refresh") .on ("click", () => this .build ());
      $("#period") .on ("change", () => this .build ());

      this .columnChart = new ColumnChart (this .username, this .repository);
      this .areaChart   = new AreaChart (this .username, this .repository);

      await Promise .all ([
         this .columnChart .setup (),
         this .areaChart .setup (),
      ]);

      this .build ();
   }

   async build ()
   {
      $("#refresh") .addClass ("active");
      $("#period-title") .text ($("#period") .val () .toUpperCaseFirst ());

      // Download and combine entries.
      const entries = await this .downloadEntries ($("#period") .val ());

      await Promise .all ([
         this .columnChart .build (entries),
         this .areaChart .build (entries),
      ]);

      $("#refresh") .removeClass ("active");
   }

   async downloadEntries (period = "quarter")
   {
      const { username, repository } = this;

      const github  = await this .download (`https://data.jsdelivr.com/v1/stats/packages/gh/${username}/${repository}?period=${period}`);
      const npm     = await this .download (`https://data.jsdelivr.com/v1/stats/packages/npm/${repository}?period=${period}`);
      const entries = Object .entries (github .hits .dates) .map (([date, hits]) => [date, { github: hits, npm: npm .hits .dates [date] }]);

      return entries;
   }

   async download (url)
   {
      const response = await fetch (url);

      return await response .json ();
   }
}

class ColumnChart
{
   constructor (username, repository)
   {
      this .username   = username;
      this .repository = repository;
   }

   async setup ()
   {
      this .colorScheme = window .matchMedia ("(prefers-color-scheme: light)");

      this .colorScheme .addEventListener ("change", event => this .changeColorScheme (event));

      // Canvas

      this .canvas  = $(`<x3d-canvas splashScreen="false"></x3d-canvas>`);
      this .browser = this .canvas .get (0) .browser;

      this .browser .addBrowserCallback ("check", X3D .X3DConstants .CONNECTION_ERROR, () =>
      {
         window .location .reload ();
      });

      this .browser .setBrowserOption ("AutoUpdate",    true);
      this .browser .setBrowserOption ("ContentScale",  -1);
      this .browser .setBrowserOption ("ContextMenu",   false);
      this .browser .setBrowserOption ("Notifications", false);
      this .browser .setBrowserOption ("Timings",       false);
      this .browser .setBrowserOption ("XRSessionMode", "NONE");

      const
         profile = this .browser .getProfile ("Interchange"),
         components = [
            this .browser .getComponent ("Geometry2D"),
            this .browser .getComponent ("Layout"),
            this .browser .getComponent ("PointingDeviceSensor"),
            this .browser .getComponent ("Text"),
         ];

      this .scene = await this .browser .createScene (profile, ... components);

      await this .browser .replaceWorld (this .scene);

      $("#column-chart") .append (this .canvas);

      // Environment

      const
         navigationInfo = this .scene .createNode ("NavigationInfo"),
         background     = this .scene .createNode ("Background"),
         viewpoint      = this .scene .createNode ("OrthoViewpoint"),
         fontLibrary    = this .scene .createNode ("FontLibrary");

      navigationInfo .set_bind = true;
      navigationInfo .type     = ["NONE"];

      background .set_bind     = true;
      background .transparency = 1;

      viewpoint .set_bind    = true;
      viewpoint .position    = new X3D .SFVec3f (0, 0, 10);
      viewpoint .fieldOfView = new X3D .SFVec4f (-0.11, 0, WIDTH, HEIGHT);

      this .viewpoint = viewpoint;

      fontLibrary .family = "Roboto";
      fontLibrary .url    = ["assets/fonts/Roboto/Roboto.ttf"];

      // await fontLibrary .getValue () .requestImmediateLoad ();

      this .scene .rootNodes .push (navigationInfo, background, viewpoint, fontLibrary);

      // y-Axis
      {
         const
            shape      = this .scene .createNode ("Shape"),
            appearance = this .scene .createNode ("Appearance"),
            material   = this .scene .createNode ("UnlitMaterial"),
            geometry   = this .scene .createNode ("LineSet"),
            coord      = this .scene .createNode ("Coordinate");

         coord    .point         = new X3D .MFVec3f (new X3D .SFVec3f (-0.01, 0, 0), new X3D .SFVec3f (-0.01, HEIGHT, 0));
         geometry .vertexCount   = [2];
         material .emissiveColor = new X3D .SFColor (0.7, 0.7, 0.7);

         geometry .coord      = coord;
         appearance .material = material;
         shape .appearance    = appearance;
         shape .geometry      = geometry;

         this .scene .rootNodes .push (shape);
      }

      // Axis Text
      {
         const
            appearance = this .scene .createNode ("Appearance"),
            material   = this .scene .createNode ("UnlitMaterial"),
            fontStyle  = this .scene .createNode ("ScreenFontStyle");

         fontStyle .family       = ["Roboto", "SANS"];
         fontStyle .pointSize    = 9;
         fontStyle .justify      = ["END"];
         material .emissiveColor = this .colorScheme .matches
            ? new X3D .SFColor (0.3, 0.3, 0.3)
            : new X3D .SFColor (0.7, 0.7, 0.7);
         appearance .material    = material;

         this .axisTextAppearance = appearance;
         this .axisTextFontStyle  = fontStyle;
      }

      // Group

      this .group = this .scene .createNode ("Transform");

      this .scene .rootNodes .push (this .group);

      // Rectangles for GitHub and npm

      const geometry = this .scene .createNode ("Rectangle2D");

      geometry .solid = true;
      geometry .size  = new X3D .SFVec2f (1, 1);

      // GitHub
      {
         const
            transform  = this .scene .createNode ("Transform"),
            shape      = this .scene .createNode ("Shape"),
            appearance = this .scene .createNode ("Appearance"),
            material   = this .scene .createNode ("UnlitMaterial");

         material .emissiveColor = new X3D .SFColor (47 / 255, 129 / 255, 247 / 255); // rgb(47, 129, 247)

         appearance .material = material;
         shape .appearance    = appearance;
         shape .geometry      = geometry;

         transform .translation = new X3D .SFVec3f (0.5, 0.5, 0);

         transform .children .push (shape);

         this .github = transform;
      }

      // npm
      {
         const
            transform  = this .scene .createNode ("Transform"),
            shape      = this .scene .createNode ("Shape"),
            appearance = this .scene .createNode ("Appearance"),
            material   = this .scene .createNode ("UnlitMaterial");

         material .emissiveColor = new X3D .SFColor (203 / 255, 56 / 255, 55 / 255); // rgb(203, 56, 55)

         appearance .material = material;
         shape .appearance    = appearance;
         shape .geometry      = geometry;

         transform .translation = new X3D .SFVec3f (0.5, 0.5, 0);

         transform .children .push (shape);

         this .npm = transform;
      }

      // Stats

      $("#hosts input") .on ("change", () => this .build (this .entries));
   }

   changeColorScheme (colorScheme)
   {
      this .axisTextAppearance .material .emissiveColor = this .colorScheme .matches
         ? new X3D .SFColor (0.3, 0.3, 0.3)
         : new X3D .SFColor (0.7, 0.7, 0.7);
   }

   async build (entries)
   {
      if (!entries)
         return;

      this .entries = entries;

      // Clear group.

      this .group .children .length = 0;

      // Determine layout values.

      const
         gap     = $("#period") .val () === "year" ? 0 : 0.002,
         length  = entries .length,
         width   = (WIDTH - gap * (length - 1)) / length;

      // Determine max.

      const max = entries .reduce ((p, [date, hosts]) =>
      {
         return Math .max (p, Object .keys (hosts) .reduce ((p, host) =>
         {
            if (!$(`#show-${host}`) .is (":checked"))
               return p;

            return p + hosts [host];
         },
         0));
      },
      0);

      this .group .scale .y = 1 / max * HEIGHT;

      // Add labels.

      const step = Math .ceil (10 ** Math .ceil (Math .log10 (Math .max (max / 10, 1))) / 2);

      for (let y = 0; y < max + step; y += step)
      {
         const
            transform = this .scene .createNode ("Transform"),
            shape     = this .scene .createNode ("Shape"),
            text      = this .scene .createNode ("Text");

         text .string    = [Math .min (y, max) .toLocaleString ("en")];
         text .solid     = true;
         text .fontStyle = this .axisTextFontStyle;

         shape .appearance = this .axisTextAppearance;
         shape .geometry   = text;

         transform .translation .x = -0.02;
         transform .translation .y = Math .min (y, max);

         transform .children .push (shape);

         this .group .children .push (transform);
      }

      // this .group .children .at (-1) .children [0] .geometry .addFieldCallback (this, "textBounds", textBounds =>
      // {
      //    this .viewpoint .fieldOfView [0] = -textBounds .x / 1000;
      // });

      // Add columns.

      for (const [i, [date, hosts]] of entries .entries ())
      {
         let sumHits = 0;

         const touchSensor = this .scene .createNode ("TouchSensor");

         touchSensor .description = i;

         for (const [host, hits] of Object .entries (hosts))
         {
            if (!$(`#show-${host}`) .is (":checked"))
               continue;

            const transform = this .scene .createNode ("Transform");

            transform .translation = new X3D .SFVec3f (i * (width + gap), sumHits, 0);
            transform .scale       = new X3D .SFVec3f (width, hits, 1);

            transform .children .push (touchSensor, this [host]);

            this .group .children .push (transform);

            sumHits += hits;
         }
      }
   }

   floor (value, step)
   {
      return Math .floor (value / step) * step;
   }
}

class AreaChart
{
   constructor (username, repository)
   {
      this .username   = username;
      this .repository = repository;
   }

   async setup ()
   {
      this .colorScheme = window .matchMedia ("(prefers-color-scheme: light)");

      this .colorScheme .addEventListener ("change", event => this .changeColorScheme (event));

      // Canvas

      this .canvas  = $(`<x3d-canvas splashScreen="false"></x3d-canvas>`);
      this .browser = this .canvas .get (0) .browser;

      this .browser .addBrowserCallback ("check", X3D .X3DConstants .CONNECTION_ERROR, () =>
      {
         window .location .reload ();
      });

      this .browser .setBrowserOption ("AutoUpdate",    true);
      this .browser .setBrowserOption ("ContentScale",  -1);
      this .browser .setBrowserOption ("ContextMenu",   false);
      this .browser .setBrowserOption ("Notifications", false);
      this .browser .setBrowserOption ("Timings",       false);
      this .browser .setBrowserOption ("XRSessionMode", "NONE");

      const
         profile = this .browser .getProfile ("Interchange"),
         components = [
            this .browser .getComponent ("Geometry2D"),
            this .browser .getComponent ("Layout"),
            this .browser .getComponent ("PointingDeviceSensor"),
            this .browser .getComponent ("Text"),
         ];

      this .scene = await this .browser .createScene (profile, ... components);

      await this .browser .replaceWorld (this .scene);

      $("#area-chart") .append (this .canvas);

      // Environment

      const
         navigationInfo = this .scene .createNode ("NavigationInfo"),
         background     = this .scene .createNode ("Background"),
         viewpoint      = this .scene .createNode ("OrthoViewpoint"),
         fontLibrary    = this .scene .createNode ("FontLibrary");

      navigationInfo .set_bind = true;
      navigationInfo .type     = ["NONE"];

      background .set_bind     = true;
      background .transparency = 1;

      viewpoint .set_bind    = true;
      viewpoint .position    = new X3D .SFVec3f (0, 0, 10);
      viewpoint .fieldOfView = new X3D .SFVec4f (-0.11, 0, WIDTH, HEIGHT);

      this .viewpoint = viewpoint;

      fontLibrary .family = "Roboto";
      fontLibrary .url    = ["assets/fonts/Roboto/Roboto.ttf"];

      // await fontLibrary .getValue () .requestImmediateLoad ();

      this .scene .rootNodes .push (navigationInfo, background, viewpoint, fontLibrary);

      // y-Axis
      {
         const
            shape      = this .scene .createNode ("Shape"),
            appearance = this .scene .createNode ("Appearance"),
            material   = this .scene .createNode ("UnlitMaterial"),
            geometry   = this .scene .createNode ("LineSet"),
            coord      = this .scene .createNode ("Coordinate");

         coord    .point         = new X3D .MFVec3f (new X3D .SFVec3f (-0.01, 0, 0), new X3D .SFVec3f (-0.01, HEIGHT, 0));
         geometry .vertexCount   = [2];
         material .emissiveColor = new X3D .SFColor (0.7, 0.7, 0.7);

         geometry .coord      = coord;
         appearance .material = material;
         shape .appearance    = appearance;
         shape .geometry      = geometry;

         this .scene .rootNodes .push (shape);
      }

      // Axis Text
      {
         const
            appearance = this .scene .createNode ("Appearance"),
            material   = this .scene .createNode ("UnlitMaterial"),
            fontStyle  = this .scene .createNode ("ScreenFontStyle");

         fontStyle .family       = ["Roboto", "SANS"];
         fontStyle .pointSize    = 9;
         fontStyle .justify      = ["END"];
         material .emissiveColor = this .colorScheme .matches
            ? new X3D .SFColor (0.3, 0.3, 0.3)
            : new X3D .SFColor (0.7, 0.7, 0.7);
         appearance .material    = material;

         this .axisTextAppearance = appearance;
         this .axisTextFontStyle  = fontStyle;
      }

      // Group

      this .group = this .scene .createNode ("Transform");

      this .scene .rootNodes .push (this .group);

      // Geometry for GitHub and npm
      {
         const
            transform  = this .scene .createNode ("Transform"),
            shape      = this .scene .createNode ("Shape"),
            geometry   = this .scene .createNode ("IndexedTriangleSet"),
            color      = this .scene .createNode ("ColorRGBA"),
            coord      = this .scene .createNode ("Coordinate");

         geometry .colorPerVertex = false;
         geometry .color          = color;
         geometry .coord          = coord;
         shape .geometry          = geometry;

         transform .children .push (shape);

         this .transform = transform;
         this .geometry  = geometry;
         this .color     = color;
         this .coord     = coord;
      }

      // Stats

      $("#hosts input") .on ("change", () => this .build (this .entries));
   }

   changeColorScheme (colorScheme)
   {
      this .axisTextAppearance .material .emissiveColor = this .colorScheme .matches
         ? new X3D .SFColor (0.3, 0.3, 0.3)
         : new X3D .SFColor (0.7, 0.7, 0.7);
   }

   async build (entries)
   {
      if (!entries)
         return;

      this .entries = entries;

      // Clear group.

      this .group .children = [this .transform];

      // Determine layout values.

      const
         length = entries .length,
         width  = WIDTH / length;

      // Determine max.

      const max = entries .reduce ((p, [date, hosts]) =>
      {
         return Math .max (p, Object .keys (hosts) .reduce ((p, host) =>
         {
            if (!$(`#show-${host}`) .is (":checked"))
               return p;

            return p + hosts [host];
         },
         0));
      },
      0);

      this .group .scale .y = 1 / max * HEIGHT;

      // Add labels.

      const step = Math .ceil (10 ** Math .ceil (Math .log10 (Math .max (max / 10, 1))) / 2);

      for (let y = 0; y < max + step; y += step)
      {
         const
            transform = this .scene .createNode ("Transform"),
            shape     = this .scene .createNode ("Shape"),
            text      = this .scene .createNode ("Text");

         text .string    = [Math .min (y, max) .toLocaleString ("en")];
         text .solid     = true;
         text .fontStyle = this .axisTextFontStyle;

         shape .appearance = this .axisTextAppearance;
         shape .geometry   = text;

         transform .translation .x = -0.02;
         transform .translation .y = Math .min (y, max);

         transform .children .push (shape);

         this .group .children .push (transform);
      }

      // this .group .children .at (-1) .children [0] .geometry .addFieldCallback (this, "textBounds", textBounds =>
      // {
      //    this .viewpoint .fieldOfView [0] = -textBounds .x / 1000;
      // });

      // Add columns.

      const range = 5;

      this .geometry .index .length = 0;
      this .color .color .length    = 0;
      this .coord .point .length    = 0;

      for (const [i, [date, hosts]] of entries .entries ())
      {
         let sumHits = 0;

         // const touchSensor = this .scene .createNode ("TouchSensor");

         // touchSensor .description = i;

         if (i > 0)
         {
            const t = (i - 1) * 3;

            this .geometry .index .push (t, t + 4, t + 1, t, t + 3, t + 4,  t + 1, t + 5, t + 2, t + 1, t + 4, t + 5);

            this .color .color .push (
               new X3D .SFColorRGBA (47 / 255, 129 / 255, 247 / 255, 1), // rgb(47, 129, 247)
               new X3D .SFColorRGBA (47 / 255, 129 / 255, 247 / 255, 1), // rgb(47, 129, 247)
            );

            this .color .color .push (
               new X3D .SFColorRGBA (203 / 255,  56 / 255,  55 / 255, 1), // rgb(203, 56, 55)
               new X3D .SFColorRGBA (203 / 255,  56 / 255,  55 / 255, 1), // rgb(203, 56, 55)
            );
         }

         this .coord .point .push (new X3D .SFVec3f (i * width, sumHits, 0));

         for (const [host, hits] of Object .entries (hosts))
         {
            let
               accumulatedHits = hits,
               numEntries      = 1;

            for (let k = i - range; k < i + range + 1; ++ k)
            {
               const entry = entries [k];

               if (!entry)
                  continue;

               accumulatedHits += entry [1] [host];

               ++ numEntries;
            }

            const y = $(`#show-${host}`) .is (":checked") ? sumHits += accumulatedHits / numEntries : sumHits;

            this .coord .point .push (new X3D .SFVec3f (i * width, y, 0));
         }
      }

      // console .log (this .transform .toVRMLString ())
   }

   floor (value, step)
   {
      return Math .floor (value / step) * step;
   }
}

Object .defineProperty (String .prototype, "toUpperCaseFirst",
{
   value ()
   {
      return this .charAt (0) .toUpperCase () + this .slice (1);
   },
   enumerable: false
});

Stats .run ();
