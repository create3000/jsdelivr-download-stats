import X3D   from "https://cdn.jsdelivr.net/npm/x_ite@14.1.5/dist/x_ite.min.mjs";
import { $ } from "https://cdn.jsdelivr.net/npm/jquery@4.0.0/dist-module/jquery.module.min.js";

import { WIDTH, HEIGHT } from "./Config.js";

class AreaChart
{
   constructor (element, username, repository)
   {
      this .element    = element;
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
            this .browser .getComponent ("Layout"),
            this .browser .getComponent ("PointingDeviceSensor"),
            this .browser .getComponent ("Text"),
         ];

      this .scene = await this .browser .createScene (profile, ... components);

      await this .browser .replaceWorld (this .scene);

      this .element .append (this .canvas);

      // Colors

      this .githubColor = new X3D .SFColor ( 47 / 255, 129 / 255, 247 / 255); // rgb(47, 129, 247)
      this .npmColor    = new X3D .SFColor (203 / 255,  56 / 255,  55 / 255); // rgb(203, 56, 55)

      // this .githubColor = SFColor .fromString (`rgb(47, 129, 247)`);
      // this .npmColor    = SFColor .fromString (`rgb(203, 56, 55)`);

      // Environment

      const
         background     = this .scene .createNode ("Background"),
         viewpoint      = this .scene .createNode ("OrthoViewpoint"),
         navigationInfo = this .scene .createNode ("NavigationInfo"),
         fontLibrary    = this .scene .createNode ("FontLibrary");

      background .set_bind     = true;
      background .transparency = 1;

      viewpoint .set_bind       = true;
      viewpoint .position       = new X3D .SFVec3f (0, 0, 10);
      viewpoint .fieldOfView    = new X3D .SFVec4f (-0.15, -0.01, WIDTH, HEIGHT);
      viewpoint .navigationInfo = navigationInfo;

      navigationInfo .type      = new X3D .MFString ("NONE");
      navigationInfo .headlight = false;

      fontLibrary .family = "Roboto";
      fontLibrary .url    = new X3D .MFString ("assets/fonts/Roboto/Roboto.ttf");

      // await fontLibrary .getValue () .requestImmediateLoad ();

      this .scene .rootNodes .push (background, viewpoint, fontLibrary);

      // y-Axis
      {
         const
            shape      = this .scene .createNode ("Shape"),
            appearance = this .scene .createNode ("Appearance"),
            material   = this .scene .createNode ("UnlitMaterial"),
            geometry   = this .scene .createNode ("LineSet"),
            coord      = this .scene .createNode ("Coordinate");

         coord    .point         = new X3D .MFVec3f (new X3D .SFVec3f (-0.01, 0, 0), new X3D .SFVec3f (-0.01, HEIGHT, 0));
         geometry .vertexCount   = new X3D .MFInt32 (2);
         material .emissiveColor = new X3D .SFColor (0.7, 0.7, 0.7);

         geometry .coord      = coord;
         appearance .material = material;
         shape .appearance    = appearance;
         shape .geometry      = geometry;

         this .scene .rootNodes .push (shape);

         this .scene .addNamedNode ("yAxis", shape);
      }

      // Labels
      {
         const
            xGroup     = this .scene .createNode ("Group"),
            yTransform = this .scene .createNode ("Transform"),
            appearance = this .scene .createNode ("Appearance"),
            material   = this .scene .createNode ("UnlitMaterial"),
            xFontStyle = this .scene .createNode ("ScreenFontStyle"),
            yFontStyle = this .scene .createNode ("ScreenFontStyle");

         xFontStyle .family    = new X3D .MFString ("Roboto", "SANS");
         xFontStyle .pointSize = 9;
         xFontStyle .justify   = new X3D .MFString ("BEGIN", "BEGIN");
         yFontStyle .family    = new X3D .MFString ("Roboto", "SANS");
         yFontStyle .pointSize = 9;
         yFontStyle .justify   = new X3D .MFString ("END");
         appearance .material  = material;

         this .scene .rootNodes .push (xGroup, yTransform);

         this .scene .addNamedNode ("xLabels", xGroup);
         this .scene .addNamedNode ("yLabels", yTransform);

         this .xLabels          = xGroup,
         this .yLabels          = yTransform,
         this .labelsAppearance = appearance;
         this .xLabelsFontStyle = xFontStyle;
         this .yLabelsFontStyle = yFontStyle;
      }

      // Geometry for GitHub and npm
      {
         const
            transform  = this .scene .createNode ("Transform"),
            shape      = this .scene .createNode ("Shape"),
            geometry   = this .scene .createNode ("IndexedTriangleSet"),
            color      = this .scene .createNode ("Color"),
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

         this .scene .rootNodes .push (transform);

         this .scene .addNamedNode ("Chart", transform);

         this .chart = transform;
      }

      // Stats

      $("#hosts input") .on ("change", () => this .build (this .entries));

      // Color Scheme

      this .changeColorScheme ();
   }

   changeColorScheme (colorScheme)
   {
      const style = window .getComputedStyle ($("body") [0]);

      this .textColor = this .cssToRGB (style .getPropertyValue ("--text-color"));

      this .labelsAppearance .material .emissiveColor = new X3D .SFColor (... this .textColor .map (c => c / 255));
   }

   cssToRGB (css)
   {
      const
         canvas  = document .createElement ("canvas"),
         context = canvas .getContext ("2d");

      context .fillStyle = css;
      context .fillRect (0, 0, 1, 1);

      return [... context .getImageData (0, 0, 1, 1) .data .subarray (0, 3)];
   }

   async build (entries, width, gap)
   {
      if (!entries)
         return false;

      this .entries = entries;

      // Clear group.

      this .xLabels .children .length = 0;
      this .yLabels .children .length = 0;

      // Determine max.

      this .max = entries .reduce ((p, [date, hosts]) =>
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

      // Add labels.

      // Add x labels.

      let xLabel = "";

      for (const [i, [date, hosts]] of entries .entries ())
      {
         const label = new Date (date) .toLocaleString ("en", { month: "short" });

         if (xLabel === label)
            continue;

         xLabel = label;

         const transform = this .createLabel ("X", i * (width + gap), -0.005, label);

         this .xLabels .children .push (transform);
      }

      // Add y labels.

      const
         log    = Math .log10 (Math .max (this .max / 10, 1)),
         factor = [5, 2, 1][Math .floor ((log - 0.001) * 3) % 3],
         step   = Math .ceil (10 ** Math .ceil (log) / factor);

      for (let y = 0; y < this .max + step; y += step)
      {
         const hits = Math .min (y, this .max);

         if (hits !== this .max && hits > this .max * 0.95)
            continue;

         const transform = this .createLabel ("Y", -0.02, hits, hits .toLocaleString ("en"));

         this .yLabels .children .push (transform);
      }

      // Scale all.

      const scale = 1 / this .max * HEIGHT;

      this .yLabels .scale .y = scale;
      this .chart   .scale .y = scale;

      return true;
   }

   createLabel (axis, x, y, string)
   {
      const
         transform = this .scene .createNode ("Transform"),
         shape     = this .scene .createNode ("Shape"),
         text      = this .scene .createNode ("Text");

      text .string    = new X3D .MFString (string);
      text .solid     = true;
      text .fontStyle = axis === "X" ? this .xLabelsFontStyle : this .yLabelsFontStyle;

      shape .appearance = this .labelsAppearance;
      shape .geometry   = text;

      transform .translation .x = x;
      transform .translation .y = y;

      transform .children .push (shape);

      return transform;
   }
}

export default AreaChart;
