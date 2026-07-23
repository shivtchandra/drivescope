"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { getBrand, getModel, getTestData, getVariant } from "@/lib/data";
import { getSimCarColor } from "@/lib/simCarColors";
import { cornerSpeedCapKmh } from "@/lib/race/grip";
import VariantSelect from "@/components/sims/VariantSelect";
import DriveRange from "@/components/ui/DriveRange";
import Stage from "../Stage";
import StylizedCar, { type CarMotionRef } from "../StylizedCar";
import { getVehicleDNA } from "@/lib/vehicle-dna";

// ── Constants ─────────────────────────────────────────────────────────────────
const ROAD_W = 7;

const CORNERS = [
  { id: "hairpin",  label: "Hairpin",      radiusM: 12, angleDeg: 150 },
  { id: "tight",   label: "Tight bend",   radiusM: 28, angleDeg: 90  },
  { id: "sweeper", label: "Fast sweeper", radiusM: 70, angleDeg: 60  },
] as const;
type CornerId = (typeof CORNERS)[number]["id"];

const SURFACES = [
  { id: "dry", label: "Dry tarmac",  muBase: 0.95 },
  { id: "wet", label: "Wet road",    muBase: 0.72 },
  { id: "mud", label: "Mud / loose", muBase: 0.55 },
] as const;
type SurfaceId = (typeof SURFACES)[number]["id"];

// ── Physics ───────────────────────────────────────────────────────────────────
function clamp(x: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, x)); }

function muFor(muBase: number, kerbKg: number, t100: number) {
  return Math.max(0.3, muBase - clamp((kerbKg - 1200) / 1600, 0, 0.25) + (t100 < 9 ? 0.06 : 0));
}

// ── Track geometry ────────────────────────────────────────────────────────────
// Car moves in +X direction initially. Right-hand turn, arc center at (0, 0, R).
// Approach: x from -approachLen to 0, z=0
// Arc: θ from 0 to alpha → pos = (R·sinθ, 0, R·(1−cosθ))
// Exit: 60m in exit direction (cosα, 0, sinα)

// Analytical car state: avoids getLength()/getPointAt() NaN risk entirely.
function getCarState(t: number, R: number, angleDeg: number) {
  const alpha = (angleDeg * Math.PI) / 180;
  const approachLen = Math.max(55, R * 1.8);
  const arcLen = R * alpha;
  const exitLen = 60;
  const totalLen = approachLen + arcLen + exitLen;
  const s = clamp(t, 0, 1) * totalLen;

  let x: number, z: number, tx: number, tz: number, inCorner = false, cf = 0;

  if (s <= approachLen) {
    x = -approachLen + s; z = 0; tx = 1; tz = 0;
  } else if (s <= approachLen + arcLen) {
    const sArc = s - approachLen;
    const theta = sArc / R;
    x = R * Math.sin(theta); z = R * (1 - Math.cos(theta));
    tx = Math.cos(theta); tz = Math.sin(theta);
    inCorner = true; cf = sArc / arcLen;
  } else {
    const sExit = s - approachLen - arcLen;
    const ca = Math.cos(alpha), sa = Math.sin(alpha);
    x = R * sa + sExit * ca; z = R * (1 - ca) + sExit * sa; tx = ca; tz = sa;
  }

  const tangent = new THREE.Vector3(tx, 0, tz);
  const right   = new THREE.Vector3(tz, 0, -tx);
  const pos     = new THREE.Vector3(x, 0, z);
  const heading = Math.atan2(-tz, tx);
  return { pos, tangent, right, heading, inCorner, cf, totalLen, approachLen };
}

// Visual-only curve for road mesh (uses getPoint, not getPointAt — no arc-length needed)
function buildCurve(radiusM: number, angleDeg: number): THREE.CatmullRomCurve3 {
  const R = radiusM;
  const alpha = (angleDeg * Math.PI) / 180;
  const approachLen = Math.max(55, R * 1.8);
  const pts: THREE.Vector3[] = [];

  for (let i = 0; i <= 8; i++) {
    pts.push(new THREE.Vector3(-approachLen + (i / 8) * approachLen, 0, 0));
  }

  const arcN = Math.max(24, Math.round(angleDeg / 3));
  for (let i = 1; i <= arcN; i++) {
    const theta = (i / arcN) * alpha;
    pts.push(new THREE.Vector3(R * Math.sin(theta), 0, R * (1 - Math.cos(theta))));
  }

  const endX = R * Math.sin(alpha);
  const endZ = R * (1 - Math.cos(alpha));
  const eDX = Math.cos(alpha);
  const eDZ = Math.sin(alpha);
  for (let i = 1; i <= 6; i++) {
    pts.push(new THREE.Vector3(endX + i * 10 * eDX, 0, endZ + i * 10 * eDZ));
  }

  return new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
}

// Use getPoint (uniform param, no arc-length) + getTangent (uses getPoint internally) — NaN-safe
function sampleCurveUniform(curve: THREE.CatmullRomCurve3, t: number) {
  const tt = clamp(t, 0, 1);
  const pos = curve.getPoint(tt);
  const tan = curve.getTangent(tt).normalize();
  const right = new THREE.Vector3(tan.z, 0, -tan.x).normalize();
  return { pos, tangent: tan, right };
}

function buildRoadRibbon(curve: THREE.CatmullRomCurve3, width: number, segs = 100) {
  const verts: number[] = [];
  const norms: number[] = [];
  const uvs:   number[] = [];
  const idxs:  number[] = [];

  for (let i = 0; i <= segs; i++) {
    const { pos, tangent } = sampleCurveUniform(curve, i / segs);
    const rt = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
    const L  = pos.clone().addScaledVector(rt, -width / 2);
    const Rv = pos.clone().addScaledVector(rt,  width / 2);

    verts.push(L.x, 0, L.z, Rv.x, 0, Rv.z);
    norms.push(0, 1, 0, 0, 1, 0);
    uvs.push(0, (i / segs) * 20, 1, (i / segs) * 20);

    if (i < segs) {
      const b = i * 2;
      idxs.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute("normal",   new THREE.Float32BufferAttribute(norms, 3));
  geo.setAttribute("uv",       new THREE.Float32BufferAttribute(uvs,   2));
  geo.setIndex(idxs);
  return geo;
}

function buildDashStrip(curve: THREE.CatmullRomCurve3, segs = 200) {
  const verts: number[] = [];
  const norms: number[] = [];
  const uvs:   number[] = [];
  const idxs:  number[] = [];
  const dashW = 0.12;

  for (let i = 0; i <= segs; i++) {
    const { pos, tangent } = sampleCurveUniform(curve, i / segs);
    const rt = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
    const L  = pos.clone().addScaledVector(rt, -dashW / 2);
    const Rv = pos.clone().addScaledVector(rt,  dashW / 2);

    verts.push(L.x, 0.006, L.z, Rv.x, 0.006, Rv.z);
    norms.push(0, 1, 0, 0, 1, 0);
    uvs.push(0, (i / segs) * 40, 1, (i / segs) * 40);

    if (i < segs) {
      const b = i * 2;
      idxs.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute("normal",   new THREE.Float32BufferAttribute(norms, 3));
  geo.setAttribute("uv",       new THREE.Float32BufferAttribute(uvs,   2));
  geo.setIndex(idxs);
  return geo;
}

// ── Scene sub-components ──────────────────────────────────────────────────────
function ConeMarker({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.28, 0]}>
        <coneGeometry args={[0.18, 0.55, 8]} />
        <meshStandardMaterial color="#d97706" roughness={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.22, 8]} />
        <meshStandardMaterial color="#111" roughness={1} />
      </mesh>
    </group>
  );
}

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.0, 0]}>
        <coneGeometry args={[0.75, 2.0, 6]} />
        <meshStandardMaterial color="#18381a" roughness={1} />
      </mesh>
      <mesh position={[0, 1.9, 0]}>
        <coneGeometry args={[0.5, 1.6, 6]} />
        <meshStandardMaterial color="#1f4d22" roughness={1} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.45, 6]} />
        <meshStandardMaterial color="#2a1a0a" roughness={1} />
      </mesh>
    </group>
  );
}

// ── Corner scene ──────────────────────────────────────────────────────────────
interface CornerSpec {
  modelId: string; kerbKg: number; t100: number;
  wheelbaseMm: number; bootLitres: number; bodyStyle: "suv" | "sedan";
  color: string; label: string; dna: any;
}

function CornerScene({
  spec, cornerId, surfaceId, entrySpeedKmh, running, onFinish, driverAction, onHud,
}: {
  spec: CornerSpec; cornerId: CornerId; surfaceId: SurfaceId;
  entrySpeedKmh: number; running: boolean;
  onFinish: (maxOffset: number, ratio: number, finalStatus: string) => void;
  driverAction: "steer" | "brake";
  onHud?: (hud: { latG: number; status: string }) => void;
}) {
  const corner  = CORNERS.find((c) => c.id === cornerId)!;
  const surf    = SURFACES.find((s) => s.id === surfaceId)!;
  const mu      = muFor(surf.muBase, spec.kerbKg, spec.t100);
  const maxSpd  = cornerSpeedCapKmh(1 / corner.radiusM, mu);
  const ratio   = entrySpeedKmh / maxSpd;
  const speedMs = entrySpeedKmh / 3.6;
  const approachLen = Math.max(55, corner.radiusM * 1.8);
  const arcLen  = corner.radiusM * ((corner.angleDeg * Math.PI) / 180);

  // Analytical path length — no curve.getLength(), no NaN risk
  const pathLen      = approachLen + arcLen + 60;
  const cornerStartT = approachLen / pathLen;
  const cornerEndT   = (approachLen + arcLen) / pathLen;

  const curve    = useMemo(() => buildCurve(corner.radiusM, corner.angleDeg), [cornerId]);
  const roadGeo  = useMemo(() => buildRoadRibbon(curve, ROAD_W, 120), [curve]);
  const vergeGeo = useMemo(() => buildRoadRibbon(curve, ROAD_W + 9, 80), [curve]);
  const dashGeo  = useMemo(() => buildDashStrip(curve, 200), [curve]);

  // Cone positions: use analytical getCarState for exact positions
  const conePositions = useMemo(() => {
    const out: THREE.Vector3[] = [];
    for (let i = 0; i < 5; i++) {
      const t = cornerStartT + (i / 4) * (cornerEndT - cornerStartT);
      const { pos, right } = getCarState(t, corner.radiusM, corner.angleDeg);
      out.push(pos.clone().addScaledVector(right, ROAD_W / 2 + 0.6));
    }
    return out;
  }, [cornerId, cornerStartT, cornerEndT]);

  // Trees: use analytical positions too
  const treePositions = useMemo(() => {
    const out: [THREE.Vector3, number][] = [];
    for (let i = 0; i < 10; i++) {
      const t = cornerStartT - 0.08 + (i / 9) * (cornerEndT - cornerStartT + 0.18);
      if (t < 0 || t > 1) continue;
      const { pos, right } = getCarState(clamp(t, 0, 1), corner.radiusM, corner.angleDeg);
      const dist = ROAD_W / 2 + 4 + ((i * 17) % 5);
      const sc = 0.8 + ((i * 13) % 4) * 0.1;
      out.push([pos.clone().addScaledVector(right, dist), sc]);
    }
    return out;
  }, [cornerId, cornerStartT, cornerEndT]);

  const carGroup  = useRef<THREE.Group>(null);
  const motionRef = useRef<CarMotionRef>({ wheelSpeed: 0, pitch: 0, roll: 0, steerAngle: 0 });
  const sim = useRef({
    s: 0,
    v_lat: 0,
    latOffset: 0,
    speed: speedMs,
    spinYaw: 0,
    done: false,
    maxOffset: 0,
    hasSpun: false,
    recovered: false,
    initialized: false,
  });
  const [hud, setHud] = useState({ latG: 0, status: "APPROACHING" });

  useFrame(({ camera }, delta) => {
    if (!running) {
      sim.current.initialized = false;
      return;
    }
    if (sim.current.done) return;

    const dt = Math.min(delta, 0.03); // Cap dt to keep physics stable

    if (!sim.current.initialized) {
      sim.current.s = 0;
      sim.current.v_lat = 0;
      sim.current.latOffset = 0;
      sim.current.speed = speedMs;
      sim.current.spinYaw = 0;
      sim.current.done = false;
      sim.current.maxOffset = 0;
      sim.current.hasSpun = false;
      sim.current.recovered = false;
      sim.current.initialized = true;
    }

    const s = sim.current.s;
    const currentSpeed = sim.current.speed;
    const latOffset = sim.current.latOffset;
    let v_lat = sim.current.v_lat;

    // Check if the car is currently off-road
    const isOffRoad = Math.abs(latOffset) > ROAD_W / 2;

    // Determine current friction coefficient mu
    let currentMu = mu;
    if (isOffRoad) {
      // Grass/dirt has much lower friction (e.g. 40% of tarmac mu)
      currentMu = mu * 0.4;
    }

    // Get road details at current s
    const t = clamp(s / pathLen, 0, 1);
    const { pos, tangent, right, heading, inCorner, cf } = getCarState(t, corner.radiusM, corner.angleDeg);
    const apex = Math.sin(cf * Math.PI);

    // Curvature of the road
    const kappa = inCorner ? 1 / corner.radiusM : 0;

    // Deceleration forces
    let dec = 0;
    let mu_lat = currentMu;

    if (driverAction === "brake" && inCorner) {
      // Emergency braking: ABS keeps some steering control
      const f_brake = 0.8;
      dec = f_brake * currentMu * 9.81;
      mu_lat = currentMu * Math.sqrt(1 - f_brake * f_brake);
    } else if (isOffRoad) {
      // Drag on grass/dirt
      dec = 4.5; // Decelerates rapidly in dirt
    }

    // Update speed
    const newSpeed = Math.max(0, currentSpeed - dec * dt);
    sim.current.speed = newSpeed;

    // Lateral physics: centripetal acceleration vs grip
    const a_req = (newSpeed * newSpeed) * kappa;
    const a_lat_max = mu_lat * 9.81;

    if (a_req > a_lat_max) {
      // Car slides outward
      const a_slip = a_req - a_lat_max;
      v_lat += a_slip * dt;
    } else {
      // Grip is sufficient to follow the curve.
      // If we have lateral velocity outward, the tyres try to decelerate it.
      if (v_lat > 0) {
        const a_rec = a_lat_max - a_req;
        v_lat = Math.max(0, v_lat - a_rec * dt);
      } else if (latOffset > 0) {
        // If speed is safe and we are not sliding, try to steer back to road
        if (newSpeed < maxSpd) {
          sim.current.recovered = true;
        }
      }
    }

    // If recovered, gently guide the car back to the road center
    if (sim.current.recovered && latOffset > 0) {
      sim.current.latOffset += (0 - latOffset) * Math.min(1.0, dt * 2.5);
      if (sim.current.latOffset < 0.05) sim.current.latOffset = 0;
    } else {
      sim.current.latOffset += v_lat * dt;
    }

    sim.current.v_lat = v_lat;
    sim.current.maxOffset = Math.max(sim.current.maxOffset, sim.current.latOffset);

    // Update path distance s
    const trackSpeedFactor = isOffRoad ? 0.7 : 1.0;
    sim.current.s = Math.min(s + newSpeed * trackSpeedFactor * dt, pathLen);

    // Yaw spin animation if off-road at high speed
    if (isOffRoad && v_lat > 2.0 && driverAction === "steer") {
      sim.current.hasSpun = true;
      sim.current.spinYaw += 4.5 * dt; // spin
    } else if (sim.current.hasSpun) {
      if (newSpeed > 1) {
        sim.current.spinYaw += 2.0 * dt;
      }
    }

    // Set position and rotation
    const carPos = pos.clone().addScaledVector(right, sim.current.latOffset);
    if (carGroup.current) {
      carGroup.current.position.copy(carPos);
      carGroup.current.rotation.y = heading + sim.current.spinYaw;
    }

    // Update wheel animations
    motionRef.current.wheelSpeed = newSpeed / 0.35;
    motionRef.current.roll = inCorner ? clamp(apex * sim.current.latOffset * 0.06, -0.28, 0.28) : 0;
    motionRef.current.steerAngle = inCorner ? clamp(apex * 0.4 - (sim.current.recovered ? 0.4 : 0), -0.5, 0.5) : 0;

    // Camera follow with off-road rumble
    const lookT = Math.min(t + (newSpeed * 2) / pathLen, 1);
    const lookAt = getCarState(lookT, corner.radiusM, corner.angleDeg).pos;
    const camTarget = carPos.clone()
      .addScaledVector(tangent, -9)
      .add(new THREE.Vector3(0, 4.5, 0));
    camera.position.lerp(camTarget, 0.08);

    if (isOffRoad) {
      const rumble = 0.06 * (newSpeed / speedMs);
      camera.position.x += (Math.random() - 0.5) * rumble;
      camera.position.y += (Math.random() - 0.5) * rumble;
      camera.position.z += (Math.random() - 0.5) * rumble;
    }

    camera.lookAt(lookAt.x, lookAt.y + 1.4, lookAt.z);

    const latG = inCorner ? (newSpeed ** 2 / corner.radiusM / 9.81) * apex : 0;
    
    let status = "APPROACHING";
    if (inCorner) {
      if (sim.current.latOffset < 0.5) {
        status = "HOLDING LINE";
      } else if (sim.current.latOffset < ROAD_W * 0.55) {
        status = "UNDERSTEERING";
      } else if (isOffRoad) {
        if (driverAction === "brake") {
          status = "ABS BRAKING IN DIRT";
        } else {
          status = "SPUN OUT IN DIRT";
        }
      } else {
        status = "RUNNING WIDE";
      }
    } else if (s >= pathLen) {
      if (isOffRoad) {
        status = "CRASHED OFF-ROAD";
      } else if (sim.current.latOffset > 0.5) {
        status = "RECOVERED TO ROAD";
      } else {
        status = "CORNER COMPLETED";
      }
    }

    setHud({ latG, status });
    if (onHud) onHud({ latG, status });

    if (newSpeed < 0.1 || s >= pathLen) {
      sim.current.done = true;
      let finalStatus = "completed";
      if (isOffRoad) {
        finalStatus = driverAction === "brake" ? "stopped_offroad" : "crashed_offroad";
      } else if (sim.current.recovered) {
        finalStatus = "recovered";
      }
      onFinish(sim.current.maxOffset, ratio, finalStatus);
    }
  });

  const roadColor = surfaceId === "mud" ? "#574231" : "#131316";
  const vergeColor = surfaceId === "mud" ? "#3d2510" : surfaceId === "wet" ? "#111418" : "#0c1208";
  const wetness = surfaceId === "wet" ? 0.2 : 0;

  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[20, -0.005, 20]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color={vergeColor} roughness={1} />
      </mesh>

      {/* Verge strip */}
      <mesh geometry={vergeGeo} receiveShadow>
        <meshStandardMaterial color={vergeColor} roughness={1} />
      </mesh>

      {/* Road surface */}
      <mesh geometry={roadGeo} receiveShadow>
        <meshStandardMaterial color={roadColor} roughness={0.88} metalness={wetness} />
      </mesh>

      {/* Edge lines */}
      <mesh geometry={buildRoadRibbon(curve, ROAD_W + 0.35, 60)}>
        <meshStandardMaterial color="#3a3a46" roughness={1} />
      </mesh>

      {/* Centre dash strip */}
      <mesh geometry={dashGeo}>
        <meshStandardMaterial color="#3d3d50" roughness={1} />
      </mesh>

      {/* Corner cones on outside */}
      {conePositions.map((p, i) => (
        <ConeMarker key={i} position={[p.x, 0, p.z]} />
      ))}

      {/* Trees on outside */}
      {treePositions.map(([p, sc], i) => (
        <Tree key={i} position={[p.x, 0, p.z]} scale={sc} />
      ))}

      {/* Car group */}
      <group ref={carGroup} position={[-approachLen, 0, 0]}>
        <StylizedCar
          modelId={spec.modelId}
          color={spec.color}
          wheelbaseMm={spec.wheelbaseMm}
          bootLitres={spec.bootLitres}
          bodyStyle={spec.bodyStyle}
          dna={spec.dna}
          motionRef={motionRef}
        />
        {running && (
          <Html position={[0, 2.8, 0]} center distanceFactor={10}>
            <div style={{ fontFamily: "monospace", textAlign: "center", pointerEvents: "none", whiteSpace: "nowrap" }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 2,
                color: hud.status === "HOLDING LINE" ? "#22c55e"
                     : hud.status === "OFF ROAD"     ? "#ef4444"
                     : hud.status === "APPROACHING"  ? "#9CA3AF"
                     : "#d97706",
                textShadow: "0 0 10px rgba(0,0,0,1)",
              }}>
                {hud.status}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", textShadow: "0 0 8px rgba(0,0,0,.9)" }}>
                {entrySpeedKmh} km/h
              </div>
              <div style={{ fontSize: 9, color: "#9CA3AF", textShadow: "0 0 6px rgba(0,0,0,.9)" }}>
                {hud.latG.toFixed(2)}g lateral
              </div>
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

// ── Spec builder ──────────────────────────────────────────────────────────────
function buildSpec(variantId: string): CornerSpec | null {
  const v = getVariant(variantId);
  if (!v) return null;
  const m  = getModel(v.modelId)!;
  const td = getTestData(v.id);
  return {
    modelId: m.id,
    kerbKg:  v.kerbWeight,
    t100:    td?.zeroTo100.value ?? 11,
    wheelbaseMm: m.dimensions.wheelbaseMm,
    bootLitres:  m.dimensions.bootLitres,
    bodyStyle:   (m.bodyStyle ?? "suv") as "suv" | "sedan",
    color: getSimCarColor(m.id, getBrand(m.brandId)!.color),
    label: `${m.name} ${v.name}`,
    dna:   getVehicleDNA(m),
  };
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Cornering3D({ initialVariant }: { initialVariant?: string }) {
  const [id, setId] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("drivescope_selected_variant") ?? initialVariant ?? "creta-sx-o-turbo-dct";
    }
    return initialVariant ?? "creta-sx-o-turbo-dct";
  });
  const [cornerId, setCornerId] = useState<CornerId>("tight");
  const [surfaceId, setSurfaceId] = useState<SurfaceId>("dry");
  const [entrySpeed, setEntrySpeed] = useState(60);
  const [driverAction, setDriverAction] = useState<"steer" | "brake">("steer");
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [result, setResult] = useState<{ maxOffset: number; ratio: number; finalStatus: string } | null>(null);
  const [liveHud, setLiveHud] = useState({ latG: 0, status: "APPROACHING" });
  const [runKey, setRunKey] = useState(0);

  const spec   = buildSpec(id);
  const corner = CORNERS.find((c) => c.id === cornerId)!;
  const surf   = SURFACES.find((s) => s.id === surfaceId)!;
  const mu     = spec ? muFor(surf.muBase, spec.kerbKg, spec.t100) : 0.9;
  const maxSpd = cornerSpeedCapKmh(1 / corner.radiusM, mu);
  const ratio  = entrySpeed / maxSpd;

  const reset = () => {
    setPhase("idle");
    setResult(null);
    setLiveHud({ latG: 0, status: "APPROACHING" });
    setRunKey((k) => k + 1);
  };

  const verdict = result
    ? result.finalStatus === "crashed_offroad" ? "Grip Lost — Ran off road"
      : result.finalStatus === "stopped_offroad" ? "ABS Active — Stopped Off-Road"
      : result.finalStatus === "recovered" ? "Understeer — Recovered"
      : result.ratio <= 1.0 ? "Clean Apex — Grip in hand"
      : result.ratio <= 1.15 ? "Understeer — Pushed wide"
      : "Grip Lost — Ran off road"
    : "";

  const explain = (() => {
    if (!spec || !result) return null;
    const r    = result.ratio;
    const latG = (entrySpeed / 3.6) ** 2 / corner.radiusM / 9.81;
    
    if (result.finalStatus === "crashed_offroad") {
      return {
        interp: `At ${entrySpeed} km/h, the ${spec.label} completely overwhelmed its front tyres. Without braking, the car understeered wide, left the tarmac, and spun out on the grass.`,
        advice: `Dangerous! On grass or dirt, tyre grip drops by ~60%, making recovery steering impossible at high speed. You must brake in a straight line before entering the corner.`,
      };
    }
    if (result.finalStatus === "stopped_offroad") {
      return {
        interp: `Emergency braking was triggered. With ABS/ESP active, the ${spec.label} shed speed rapidly while sliding off-road, coming to a controlled stop in the dirt.`,
        advice: `Emergency ABS braking shares traction between steering and slowing down. It prevents high-speed impacts, but safe corner entry speed is still ${maxSpd.toFixed(0)} km/h.`,
      };
    }
    if (result.finalStatus === "recovered" || r <= 1.15) {
      return {
        interp: `The ${spec.label} experienced front-axle slip, sliding ${result.maxOffset.toFixed(1)}m wide of the apex. As the corner opened up and speed dropped, tyres regained grip and recovered the line.`,
        advice: `Understeer recovery was possible because speed was close to the limit. For clean everyday driving, slow down slightly earlier.`,
      };
    }
    return {
      interp: `At ${entrySpeed} km/h through this ${corner.label.toLowerCase()}, the ${spec.label} generates ${latG.toFixed(2)}g of lateral force — within its ${mu.toFixed(2)}µ grip limit.`,
      advice: `Excellent grip reserves. Stiff anti-roll bars or torque vectoring help maintain stability. Traction budget remains for emergency corrections.`,
    };
  })();

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5 items-end">
        <VariantSelect
          label="Vehicle"
          value={id}
          onChange={(x) => {
            reset();
            setId(x);
            if (typeof window !== "undefined") localStorage.setItem("drivescope_selected_variant", x);
          }}
        />

        <div className="text-sm">
          <span className="text-secondary text-xs block mb-1.5">Corner type</span>
          <div className="flex rounded-xl border border-[#161616]/12 overflow-hidden">
            {CORNERS.map((c) => (
              <button
                key={c.id}
                onClick={() => { reset(); setCornerId(c.id); }}
                className={`flex-1 px-2 py-2 text-xs transition-colors ${
                  cornerId === c.id ? "bg-[rgba(200,76,49,0.12)] text-primary font-semibold" : "text-secondary hover:text-primary"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-sm">
          <span className="text-secondary text-xs block mb-1.5">Surface</span>
          <div className="flex rounded-xl border border-[#161616]/12 overflow-hidden">
            {SURFACES.map((s) => (
              <button
                key={s.id}
                onClick={() => { reset(); setSurfaceId(s.id); }}
                className={`flex-1 px-2 py-2 text-xs transition-colors ${
                  surfaceId === s.id ? "bg-[rgba(200,76,49,0.12)] text-primary font-semibold" : "text-secondary hover:text-primary"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-sm">
          <span className="text-secondary text-xs block mb-1.5">Driver reaction</span>
          <div className="flex rounded-xl border border-[#161616]/12 overflow-hidden">
            <button
              onClick={() => { reset(); setDriverAction("steer"); }}
              className={`flex-1 px-2 py-2 text-xs transition-colors ${
                driverAction === "steer" ? "bg-[rgba(200,76,49,0.12)] text-primary font-semibold" : "text-secondary hover:text-primary"
              }`}
            >
              Steer only
            </button>
            <button
              onClick={() => { reset(); setDriverAction("brake"); }}
              className={`flex-1 px-2 py-2 text-xs transition-colors ${
                driverAction === "brake" ? "bg-[rgba(200,76,49,0.12)] text-primary font-semibold" : "text-secondary hover:text-primary"
              }`}
            >
              Emergency brake
            </button>
          </div>
        </div>

        <div className="block text-sm space-y-1">
          <DriveRange
            label="Entry speed"
            value={entrySpeed}
            onChange={(v) => { reset(); setEntrySpeed(v); }}
            min={20}
            max={140}
            step={5}
            mobileStep={10}
            format={(v) => `${v} km/h`}
            presets={[40, 80, 120]}
            presetFormat={(v) => `${v}`}
            accentClass="accent-[#C84C31]"
          />
          <div className="flex justify-between text-[10px] text-secondary">
            <span>20</span>
            <span className={ratio > 1 ? "text-[#d97706] font-semibold" : "text-secondary"}>
              SAFE: {maxSpd.toFixed(0)} km/h
            </span>
            <span>140</span>
          </div>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-black/[0.08]" style={{ height: 380 }}>
        {spec && (
          <Stage
            key={runKey}
            camera={{ position: [-64, 4.5, 0], fov: 50 }}
            fog={[45, 160]}
            className="w-full h-full"
          >
            <CornerScene
              spec={spec}
              cornerId={cornerId}
              surfaceId={surfaceId}
              entrySpeedKmh={entrySpeed}
              running={phase === "running"}
              driverAction={driverAction}
              onHud={setLiveHud}
              onFinish={(maxOffset, r, finalStatus) => {
                setResult({ maxOffset, ratio: r, finalStatus });
                setPhase("done");
              }}
            />
          </Stage>
        )}

        {/* Grip load bar while running */}
        {phase === "running" && (
          <div className="absolute bottom-3 left-4 right-4 pointer-events-none z-10 flex items-center gap-3">
            <span className="text-[10px] font-mono text-white/60 uppercase">Grip load</span>
            <div className="flex-1 h-1 bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min((liveHud.latG / (mu || 0.1)) * 100, 100)}%`,
                  background: (liveHud.latG / (mu || 0.1)) > 1.0
                    ? "linear-gradient(90deg,#d97706,#ef4444)"
                    : "linear-gradient(90deg,#22c55e,#C84C31)",
                }}
              />
            </div>
            <span className="text-[10px] font-mono text-white/60">{Math.min((liveHud.latG / (mu || 0.1)) * 100, 100).toFixed(0)}%</span>
          </div>
        )}

        {/* Idle overlay */}
        {phase === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 backdrop-blur-[2px] z-10">
            <p className="text-secondary font-mono text-xs uppercase tracking-widest mb-3">Cornering Grip Analyzer</p>
            <h3 className="text-xl font-bold tracking-tight text-white mb-2 uppercase">
              {corner.label} · r {corner.radiusM} m · {surf.label}
            </h3>
            <p className="text-sm text-secondary mb-6">
              Safe speed:{" "}
              <span className="text-white font-semibold">{maxSpd.toFixed(0)} km/h</span>
              {ratio > 1 && (
                <span className="text-[#d97706] ml-2 font-medium">
                  · Entry is +{((ratio - 1) * 100).toFixed(0)}% over limit
                </span>
              )}
            </p>
            <button
              onClick={() => setPhase("running")}
              className="px-10 py-4 bg-accent text-white font-bold text-base rounded-xl hover:scale-105 transition-transform"
            >
              TAKE THE CORNER
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {phase === "done" && explain && (
        <div className="grid md:grid-cols-12 gap-4">
          <div className="md:col-span-4 glass p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">Corner Result</p>
            <h4
              className={`text-base font-bold ${
                result!.ratio > 1.15 ? "text-[#ef4444]"
                : result!.ratio > 1  ? "text-[#d97706]"
                : "text-[#22c55e]"
              }`}
            >
              {verdict}
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-black/[0.06]">
              <div>
                <span className="text-secondary text-xs block">Safe speed</span>
                <span className="font-semibold">{maxSpd.toFixed(0)} km/h</span>
              </div>
              <div>
                <span className="text-secondary text-xs block">Your entry</span>
                <span className={`font-semibold ${result!.ratio > 1 ? "text-[#d97706]" : ""}`}>
                  {entrySpeed} km/h
                </span>
              </div>
              <div>
                <span className="text-secondary text-xs block">Grip µ</span>
                <span className="font-semibold">{mu.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-secondary text-xs block">Peak lateral G</span>
                <span className="font-semibold">
                  {((entrySpeed / 3.6) ** 2 / corner.radiusM / 9.81).toFixed(2)}g
                </span>
              </div>
            </div>
            <button
              onClick={reset}
              className="w-full py-2 rounded-lg text-xs font-semibold border border-black/10 hover:bg-black/5 transition-colors"
            >
              Re-run Corner
            </button>
          </div>

          <div className="md:col-span-8 glass p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-1">
              AI Handling Lab Advice
            </p>
            <h4 className="font-semibold mb-3">Why it behaves this way</h4>
            <p className="text-sm text-secondary leading-relaxed mb-2">
              <span className="font-medium text-primary">Physics: </span>
              {explain.interp}
            </p>
            <p className="text-sm text-secondary leading-relaxed">
              <span className="font-medium text-primary">Buying impact: </span>
              {explain.advice}
            </p>
          </div>
        </div>
      )}

      <div className="border border-[#161616]/10 bg-[#F4F0E8]/40 p-4 rounded-2xl text-[11px] text-secondary leading-relaxed">
        <p className="font-semibold text-primary mb-1 font-mono uppercase tracking-wider text-[10px]">
          Corner Physics Guide //
        </p>
        <p>
          <strong>Grip limit (µ·g/r)</strong> — maximum cornering speed before tyres lose lateral grip. Halved on wet roads, severely reduced on mud.
          Smaller corner radius = lower limit regardless of surface. <strong>Body roll</strong> transfers weight to outer tyres;
          turbo and sport-tuned cars have stiffer setups that resist this and hold tighter lines.
        </p>
      </div>
    </div>
  );
}
