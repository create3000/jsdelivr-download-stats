import X3D   from "https://cdn.jsdelivr.net/npm/x_ite@latest/dist/x_ite.min.mjs";
import { $ } from "https://cdn.jsdelivr.net/npm/jquery@4.0.0/dist-module/jquery.module.min.js";

// window .X3D = X3D;

const
   WIDTH  = 1,
   HEIGHT = 0.3;

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
            this .browser .getComponent ("Layout"),
            this .browser .getComponent ("PointingDeviceSensor"),
            this .browser .getComponent ("Text"),
         ];

      this .scene = await this .browser .createScene (profile, ... components);

      await this .browser .replaceWorld (this .scene);

      $("#column-chart") .append (this .canvas);

      // Colors

      this .githubColor = new X3D .SFColorRGBA ( 47 / 255, 129 / 255, 247 / 255, 1); // rgb(47, 129, 247)
      this .npmColor    = new X3D .SFColorRGBA (203 / 255,  56 / 255,  55 / 255, 1); // rgb(203, 56, 55)

      // Environment

      const
         navigationInfo = this .scene .createNode ("NavigationInfo"),
         background     = this .scene .createNode ("Background"),
         viewpoint      = this .scene .createNode ("OrthoViewpoint"),
         fontLibrary    = this .scene .createNode ("FontLibrary");

      navigationInfo .set_bind = true;
      navigationInfo .type     = new X3D .MFString ("NONE");

      background .set_bind     = true;
      background .transparency = 1;

      viewpoint .set_bind    = true;
      viewpoint .position    = new X3D .SFVec3f (0, 0, 10);
      viewpoint .fieldOfView = new X3D .SFVec4f (-0.15, 0, WIDTH, HEIGHT);

      this .viewpoint = viewpoint;

      fontLibrary .family = "Roboto";
      fontLibrary .url    = new X3D .MFString ("assets/fonts/Roboto/Roboto.ttf");

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
         geometry .vertexCount   = new X3D .MFInt32 (2);
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

         fontStyle .family    = new X3D .MFString ("Roboto", "SANS");
         fontStyle .pointSize = 9;
         fontStyle .justify   = new X3D .MFString ("END");
         appearance .material = material;

         this .axisTextAppearance = appearance;
         this .axisTextFontStyle  = fontStyle;
      }

      // Group

      this .group = this .scene .createNode ("Transform");

      this .scene .rootNodes .push (this .group);

      // Geometry for GitHub and npm
      {
         const
            transform   = this .scene .createNode ("Transform"),
            shape       = this .scene .createNode ("Shape"),
            geometry    = this .scene .createNode ("IndexedTriangleSet"),
            color       = this .scene .createNode ("ColorRGBA"),
            coord       = this .scene .createNode ("Coordinate"),
            touchSensor = this .scene .createNode ("TouchSensor");

         geometry .colorPerVertex = false;
         geometry .color          = color;
         geometry .coord          = coord;
         shape .geometry          = geometry;

         transform .children .push (shape, touchSensor);

         this .transform = transform;
         this .geometry  = geometry;
         this .color     = color;
         this .coord     = coord;
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

      this .axisTextAppearance .material .emissiveColor = new X3D .SFColor (... this .textColor .map (c => c / 255));
   }

   cssToRGB (css)
   {
      const
         canvas  = document .createElement ("canvas"),
         context = canvas .getContext ("2d");

      context.fillStyle = css;
      context.fillRect (0, 0, 1, 1);

      return [... context .getImageData (0, 0, 1, 1) .data .subarray (0, 3)];
   }

   async build (entries)
   {
      if (!entries)
         return;

      this .entries = entries;

      // Clear group.

      this .group .children = new X3D .MFNode (this .transform);

      // Determine layout values.

      const
         gap     = $("#period") .val () === "year" ? 0 : 0.002,
         length  = entries .length,
         width   = (WIDTH - gap * (length - 1)) / length;

      let max = 0;

      // Add columns.

      this .geometry .index .length = 0;
      this .color .color .length    = 0;
      this .coord .point .length    = 0;

      for (const [i, [date, hosts]] of entries .entries ())
      {
         let sumHits = 0;

         const t = i * 6;

         this .geometry .index .push (t, t + 1, t + 3, t, t + 3, t + 2,  t + 2, t + 3, t + 5, t + 2, t + 5, t + 4);

         this .color .color .push (
            this .githubColor, this .githubColor,
            this .npmColor, this .npmColor,
         );

         this .coord .point .push (
            new X3D .SFVec3f (i * (width + gap),         sumHits, 0),
            new X3D .SFVec3f (i * (width + gap) + width, sumHits, 0),
         );

         for (const [host, hits] of Object .entries (hosts))
         {
            const y = $(`#show-${host}`) .is (":checked")
               ? sumHits += hits
               : sumHits;

            this .coord .point .push (
               new X3D .SFVec3f (i * (width + gap),         y, 0),
               new X3D .SFVec3f (i * (width + gap) + width, y, 0),
            );
         }

         max = Math .max (max, sumHits);
      }

      // Add labels.

      const step = Math .ceil (10 ** Math .ceil (Math .log10 (Math .max (max / 10, 1))) / 2);

      for (let y = 0; y < max + step; y += step)
      {
         const
            transform = this .scene .createNode ("Transform"),
            shape     = this .scene .createNode ("Shape"),
            text      = this .scene .createNode ("Text");

         text .string    = new X3D .MFString (Math .min (y, max) .toLocaleString ("en"));
         text .solid     = true;
         text .fontStyle = this .axisTextFontStyle;

         shape .appearance = this .axisTextAppearance;
         shape .geometry   = text;

         transform .translation .x = -0.02;
         transform .translation .y = Math .min (y, max);

         transform .children .push (shape);

         this .group .children .push (transform);
      }

      // Scale all.

      this .group .scale .y = 1 / max * HEIGHT;
   }

   floor (value, step)
   {
      return Math .floor (value / step) * step;
   }
}

export default ColumnChart;
