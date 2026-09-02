export const CAMP_MAP_WIDTH = 1000;
export const CAMP_MAP_HEIGHT = 1160;

export type CampMapFeatureKind =
  | "building"
  | "activity"
  | "cabin";

export type CampMapFeature = {
  id: string;
  name: string;
  kind: CampMapFeatureKind;
  x: number;
  y: number;
  width: number;
  height: number;
  shape?: "rect" | "ellipse";
};

export const CAMP_MAP_FEATURES: CampMapFeature[] = [
  {
    id: "camp-fire",
    name: "Camp Fire",
    kind: "activity",
    x: 155,
    y: 235,
    width: 120,
    height: 74,
    shape: "ellipse",
  },
  {
    id: "field",
    name: "Field",
    kind: "activity",
    x: 410,
    y: 205,
    width: 118,
    height: 72,
  },
  {
    id: "mini-ropes",
    name: "Mini Ropes",
    kind: "activity",
    x: 495,
    y: 315,
    width: 126,
    height: 72,
  },
  {
    id: "rec-hall",
    name: "Rec Hall",
    kind: "building",
    x: 505,
    y: 414,
    width: 118,
    height: 72,
  },
  {
    id: "barn",
    name: "Barn",
    kind: "building",
    x: 766,
    y: 132,
    width: 104,
    height: 62,
  },
  {
    id: "riding",
    name: "Riding",
    kind: "activity",
    x: 748,
    y: 225,
    width: 150,
    height: 105,
    shape: "ellipse",
  },
  {
    id: "tennis",
    name: "Tennis",
    kind: "activity",
    x: 728,
    y: 537,
    width: 128,
    height: 68,
  },
  {
    id: "dining-hall",
    name: "Dining Hall",
    kind: "building",
    x: 684,
    y: 678,
    width: 124,
    height: 88,
  },
  {
    id: "arch-loons-house",
    name: "Arch Loons House",
    kind: "building",
    x: 150,
    y: 595,
    width: 132,
    height: 78,
  },
  {
    id: "lower-lodge",
    name: "Lower Lodge",
    kind: "building",
    x: 455,
    y: 696,
    width: 126,
    height: 70,
  },
  {
    id: "office",
    name: "Office",
    kind: "building",
    x: 666,
    y: 870,
    width: 102,
    height: 60,
  },
  {
    id: "gymnastics",
    name: "Gymnastics",
    kind: "activity",
    x: 445,
    y: 944,
    width: 142,
    height: 68,
  },
  {
    id: "boat-shed",
    name: "Boat Shed",
    kind: "building",
    x: 278,
    y: 1038,
    width: 110,
    height: 62,
  },
];

export const CAMP_MAP_CABINS: CampMapFeature[] = [
  { id: "cabin-a1", name: "Cabin", kind: "cabin", x: 142, y: 332, width: 42, height: 26 },
  { id: "cabin-a2", name: "Cabin", kind: "cabin", x: 196, y: 322, width: 42, height: 26 },
  { id: "cabin-a3", name: "Cabin", kind: "cabin", x: 250, y: 323, width: 42, height: 26 },
  { id: "cabin-a4", name: "Cabin", kind: "cabin", x: 302, y: 336, width: 42, height: 26 },

  { id: "cabin-b1", name: "Cabin", kind: "cabin", x: 288, y: 389, width: 42, height: 26 },
  { id: "cabin-b2", name: "Cabin", kind: "cabin", x: 303, y: 431, width: 42, height: 26 },
  { id: "cabin-b3", name: "Cabin", kind: "cabin", x: 312, y: 475, width: 42, height: 26 },
  { id: "cabin-b4", name: "Cabin", kind: "cabin", x: 295, y: 520, width: 42, height: 26 },

  { id: "cabin-c1", name: "Cabin", kind: "cabin", x: 276, y: 733, width: 42, height: 26 },
  { id: "cabin-c2", name: "Cabin", kind: "cabin", x: 302, y: 778, width: 42, height: 26 },
  { id: "cabin-c3", name: "Cabin", kind: "cabin", x: 329, y: 821, width: 42, height: 26 },
  { id: "cabin-c4", name: "Cabin", kind: "cabin", x: 355, y: 864, width: 42, height: 26 },
  { id: "cabin-c5", name: "Cabin", kind: "cabin", x: 385, y: 905, width: 42, height: 26 },
  { id: "cabin-c6", name: "Cabin", kind: "cabin", x: 410, y: 946, width: 42, height: 26 },

  { id: "cabin-d1", name: "Cabin", kind: "cabin", x: 351, y: 1005, width: 42, height: 26 },
  { id: "cabin-d2", name: "Cabin", kind: "cabin", x: 398, y: 1027, width: 42, height: 26 },
  { id: "cabin-d3", name: "Cabin", kind: "cabin", x: 448, y: 1048, width: 42, height: 26 },
  { id: "cabin-d4", name: "Cabin", kind: "cabin", x: 500, y: 1065, width: 42, height: 26 },
];

function Woodland({
  d,
}: {
  d: string;
}) {
  return (
    <path
      className="camp-map-woodland"
      d={d}
    />
  );
}

function Road({
  d,
  width = 18,
}: {
  d: string;
  width?: number;
}) {
  return (
    <path
      className="camp-map-road"
      d={d}
      strokeWidth={width}
    />
  );
}

export default function CampMapBase() {
  return (
    <g
      className="member-map-base"
      aria-hidden="true"
    >
      <rect
        width={CAMP_MAP_WIDTH}
        height={CAMP_MAP_HEIGHT}
        className="camp-map-ground"
      />

      <path
        className="camp-map-lake"
        d="
          M 0 610
          C 72 628 116 688 135 768
          C 153 844 173 912 226 979
          C 267 1031 290 1095 300 1160
          L 0 1160
          Z
        "
      />

      <Woodland
        d="
          M 62 54
          C 168 18 316 28 394 95
          C 431 128 419 185 361 204
          C 288 228 173 206 100 166
          C 55 141 31 93 62 54
          Z
        "
      />

      <Woodland
        d="
          M 100 350
          C 182 315 292 332 343 389
          C 391 444 375 526 316 559
          C 254 592 156 569 105 508
          C 66 461 58 386 100 350
          Z
        "
      />

      <Woodland
        d="
          M 566 395
          C 638 360 707 377 731 431
          C 753 482 728 532 668 548
          C 608 565 548 530 539 476
          C 531 436 541 409 566 395
          Z
        "
      />

      <Woodland
        d="
          M 590 805
          C 690 764 829 790 889 857
          C 938 911 916 993 842 1021
          C 754 1054 639 1029 581 960
          C 540 911 540 831 590 805
          Z
        "
      />

      <Road
        d="
          M 575 -20
          C 619 104 662 194 712 287
          C 763 383 812 463 873 539
        "
        width={28}
      />

      <Road
        d="
          M 123 288
          C 211 274 295 310 362 350
          C 414 381 452 390 498 378
        "
      />

      <Road
        d="
          M 319 355
          C 321 441 290 509 234 578
          C 196 626 184 695 205 760
          C 228 830 276 883 332 930
          C 383 974 443 1010 520 1046
        "
      />

      <Road
        d="
          M 231 771
          C 329 818 434 793 526 752
          C 603 717 685 693 755 707
          C 836 724 871 788 846 850
          C 828 894 786 919 742 929
        "
      />

      <path
        className="camp-map-path"
        d="
          M 374 360
          C 446 321 505 278 555 218
        "
      />

      <path
        className="camp-map-path"
        d="
          M 525 738
          C 520 837 505 910 480 983
        "
      />

      <path
        className="camp-map-shore"
        d="
          M 0 610
          C 72 628 116 688 135 768
          C 153 844 173 912 226 979
          C 267 1031 290 1095 300 1160
        "
      />

      <text
        x="54"
        y="920"
        className="camp-map-water-label"
      >
        SEBAGO
      </text>

      <text
        x="58"
        y="946"
        className="camp-map-water-label"
      >
        LAKE
      </text>

      <text
        x="682"
        y="212"
        className="camp-map-road-label"
        transform="rotate(62 682 212)"
      >
        ROUTE 114
      </text>

      <text
        x="136"
        y="98"
        className="camp-map-title"
      >
        CAMP MATAPONI
      </text>

      <text
        x="185"
        y="817"
        className="camp-map-small-label"
      >
        BEACH
      </text>

      <text
        x="814"
        y="445"
        className="camp-map-small-label"
      >
        PARKING
      </text>
    </g>
  );
}
