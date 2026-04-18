import X3D from "https://cdn.jsdelivr.net/npm/x_ite@14.1.3/dist/x_ite.min.mjs";
import { $ } from "https://code.jquery.com/jquery-4.0.0.module.min.js";

const
   WIDTH  = 1,
   HEIGHT = 0.4;

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
         return;

      $("title") .text (`${this .username}/${this .repository} - ${$("title") .text ()}`);

      // Canvas

      this .canvas  = $(`<x3d-canvas splashScreen="false"></x3d-canvas>`);
      this .browser = this .canvas .get (0) .browser;

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
            this .browser .getComponent ("PointingDeviceSensor"),
         ];

      this .scene = await this .browser .createScene (profile, ... components);

      await this .browser .replaceWorld (this .scene);

      $("#stats") .append (this .canvas);

      // Environment

      const
         navigationInfo = this .scene .createNode ("NavigationInfo"),
         background     = this .scene .createNode ("Background"),
         viewpoint      = this .scene .createNode ("OrthoViewpoint");

      navigationInfo .set_bind = true;
      navigationInfo .type     = ["NONE"];

      background .set_bind     = true;
      background .transparency = 1;

      viewpoint .set_bind    = true;
      viewpoint .position    = new X3D .SFVec3f (0, 0, 10);
      viewpoint .fieldOfView = new X3D .SFVec4f (0, 0, WIDTH, HEIGHT);

      this .scene .rootNodes .push (navigationInfo, background, viewpoint);

      // Group

      this .group = this .scene .createNode ("Group");

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

         transform .translation  = new X3D .SFVec3f (0.5, 0.2, 0);
         transform .scale        = new X3D .SFVec3f (WIDTH, HEIGHT, 1);

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

         transform .translation  = new X3D .SFVec3f (0.5, 0.2, 0);
         transform .scale        = new X3D .SFVec3f (WIDTH, HEIGHT, 1);

         transform .children .push (shape);

         this .npm = transform;
      }

      // Stats

      $("#hosts input") .on ("change", () => this .stats ());

      await this .downloadEntries ();

      // Download and combine entries.

      this .stats ();
   }

   async downloadEntries (period = "quarter")
   {
      const { username, repository } = this;

      const github  = await this .download (`https://data.jsdelivr.com/v1/stats/packages/gh/${username}/${repository}?period=${period}`);
      const npm     = await this .download (`https://data.jsdelivr.com/v1/stats/packages/npm/${repository}?period=${period}`);
      const entries = Object .entries (github .hits .dates) .map (([date, hits]) => [date, { github: hits, npm: npm .hits .dates [date] }]);

      this .entries = entries;
   }

   async stats ()
   {
      // Determine layout values.

      const
         entries = this .entries,
         gap     = 0.002,
         length  = entries .length,
         width   = (WIDTH - gap * (length - 1)) / length;

      // Determine max.

      const max = ["github", "npm"] .reduce ((p, host) =>
      {
         if (!$(`#show-${host}`) .is (":checked"))
            return p;

         return p + entries .reduce ((p, [_, hosts]) => Math .max (p, hosts [host]), 0);
      },
      0);

      // Clear group.

      this .group .children .length = 0;

      // Add columns.

      for (const [i, [date, server]] of entries .entries ())
      {
         let y = 0;

         for (const [host, hits] of Object .entries (server))
         {
            if (!$(`#show-${host}`) .is (":checked"))
               continue;

            const
               touchSensor = this .scene .createNode ("TouchSensor"),
               transform   = this .scene .createNode ("Transform");

            transform .translation = new X3D .SFVec3f (i * (width + gap), y / max * HEIGHT, 0);
            transform .scale       = new X3D .SFVec3f (width, hits / max, 1);

            transform .children .push (touchSensor, this [host]);

            this .group .children .push (transform);

            y += hits;
         }
      }
   }

   async download (url)
   {
      const response = await fetch (url, {
         method: 'GET',
         headers: {
            "accept": "application/json",
         },
      });

      return await response .json ();
   }
}

Stats .run ();
