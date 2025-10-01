{ pkgs }: {
  deps = [
    # Core build tools
    pkgs.pkg-config

    # GTK / Cairo / Pango stack
    pkgs.cairo
    pkgs.pango
    pkgs.gdk-pixbuf
    pkgs.fontconfig
    pkgs.freetype
    pkgs.harfbuzz
    pkgs.graphite2
    pkgs.atk
    pkgs.glib
    pkgs.glib.out
    pkgs.pango.out
    pkgs.gdk-pixbuf.out
    pkgs.cairo.out
    pkgs.gobject-introspection
    pkgs.libffi

    # Python 3.11 with pip
    pkgs.python311Full
    pkgs.python311Packages.pip
  ];
}
