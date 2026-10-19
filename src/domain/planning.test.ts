import { describe, expect, it } from "vitest";
import {
  briefing,
  dataSchema,
  emptyData,
  parseBackup,
  serializeBackup,
  storedDataSchema,
  type Task,
} from "./model";
import {
  type Goal,
  type Routine,
  routineSchema,
  scheduleSchema,
} from "./planningSchema";
import {
  addDays,
  conflicts,
  dayAppointments,
  goalProgress,
  plannedMinutes,
  removeTask,
  routineOccurs,
  setRoutineDone,
  weekDays,
} from "./planning";
import { gardenDirection } from "./garden";
const date = "2026-10-19T09:00:00.000Z";
const routine = (patch: Partial<Routine> = {}): Routine => ({
  id: "r1",
  title: "Préparer la journée",
  description: "",
  weekdays: [1, 3, 5],
  startDate: "2026-10-01",
  endDate: "",
  time: "09:00",
  duration: 30,
  paused: false,
  createdAt: date,
  ...patch,
});
const task = (patch: Partial<Task> = {}): Task => ({
  id: "t1",
  title: "Première étape",
  description: "",
  due: "",
  status: "todo",
  priority: "medium",
  completedAt: null,
  projectId: "",
  createdAt: date,
  ...patch,
});
const goal = (patch: Partial<Goal> = {}): Goal => ({
  id: "g1",
  title: "Résultat",
  description: "",
  deadline: "",
  taskIds: ["t1"],
  paused: false,
  createdAt: date,
  ...patch,
});

describe("Calendrier et créneaux", () => {
  it("repère aussi les intervalles emboîtés et non triés sans modifier la source", () => {
    const items = [
      { key: "middle", start: "10:00", duration: 30 },
      { key: "last", start: "13:00", duration: 30 },
      { key: "long", start: "09:00", duration: 180 },
      { key: "first", start: "09:30", duration: 10 },
      { key: "edge", start: "12:00", duration: 30 },
    ].map((item) => ({
      ...item,
      kind: "task" as const,
      id: item.key,
      title: item.key,
      done: false,
    }));
    expect([...conflicts(items)].sort()).toEqual(["first", "long", "middle"]);
    expect(items[0].key).toBe("middle");
  });
  it("garde des semaines lundi-dimanche au changement d’année et d’heure", () => {
    expect(weekDays("2027-01-01")).toEqual([
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
    ]);
    expect(addDays("2026-03-28", 1)).toBe("2026-03-29");
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30");
    expect(addDays("2026-10-25", 1)).toBe("2026-10-26");
  });
  it("refuse les horaires impossibles, durées invalides et débordements après minuit", () => {
    for (const value of [
      { day: "2026-02-30", start: "09:00", duration: 30 },
      { day: "2026-10-19", start: "25:00", duration: 30 },
      { day: "2026-10-19", start: "23:45", duration: 30 },
      { day: "2026-10-19", start: "09:00", duration: 0 },
    ])
      expect(scheduleSchema.safeParse(value).success).toBe(false);
    expect(
      scheduleSchema.safeParse({
        day: "2026-10-19",
        start: "23:30",
        duration: 30,
      }).success,
    ).toBe(true);
  });
  it("détecte les chevauchements tâches/routines sans confondre deux créneaux contigus", () => {
    const data = {
      ...emptyData(),
      tasks: [
        task({ schedule: { day: "2026-10-19", start: "09:20", duration: 40 } }),
      ],
      routines: [routine(), routine({ id: "r2", time: "10:00" })],
    };
    const items = dayAppointments(data, "2026-10-19");
    expect([...conflicts(items)].sort()).toEqual(["routine/r1", "task/t1"]);
    expect(plannedMinutes(items)).toBe(90);
    data.tasks[0] = task({
      status: "done",
      completedAt: date,
      schedule: { day: "2026-10-19", start: "09:20", duration: 40 },
    });
    expect(conflicts(dayAppointments(data, "2026-10-19")).size).toBe(0);
  });
  it("sépare date limite et créneau dans les priorités du jour", () => {
    const result = briefing(
      {
        ...emptyData(),
        tasks: [
          task({
            id: "future",
            schedule: { day: "2026-10-20", start: "09:00", duration: 30 },
          }),
          task({
            id: "now",
            due: "2026-11-01",
            schedule: { day: "2026-10-19", start: "09:00", duration: 30 },
          }),
          task({
            id: "late",
            due: "2026-10-18",
            schedule: { day: "2026-10-20", start: "09:00", duration: 30 },
          }),
        ],
      },
      "2026-10-19",
    );
    expect(result.priorities.map((task) => task.id).sort()).toEqual([
      "late",
      "now",
    ]);
    expect(result.planned.map((task) => task.id)).toEqual(["now"]);
  });
});
describe("Routines sans duplication", () => {
  it("respecte le rythme, les dates inclusives et la pause", () => {
    expect(routineOccurs(routine(), "2026-10-19")).toBe(true);
    expect(routineOccurs(routine(), "2026-10-20")).toBe(false);
    expect(
      routineOccurs(routine({ endDate: "2026-10-19" }), "2026-10-19"),
    ).toBe(true);
    expect(
      routineOccurs(routine({ endDate: "2026-10-18" }), "2026-10-19"),
    ).toBe(false);
    expect(routineOccurs(routine({ paused: true }), "2026-10-19")).toBe(false);
    expect(routineSchema.safeParse(routine({ weekdays: [] })).success).toBe(
      false,
    );
    expect(
      routineSchema.safeParse(routine({ endDate: "2026-09-01" })).success,
    ).toBe(false);
  });
  it("enregistre puis annule une réalisation sans tâche créée et refuse le futur", () => {
    const data = { ...emptyData(), routines: [routine()] };
    const done = setRoutineDone(data, "r1", "2026-10-19", "2026-10-19");
    expect(done.routineEntries).toHaveLength(1);
    expect(done.tasks).toHaveLength(0);
    expect(
      setRoutineDone(done, "r1", "2026-10-19", "2026-10-19").routineEntries,
    ).toHaveLength(0);
    expect(() =>
      setRoutineDone(data, "r1", "2026-10-21", "2026-10-19"),
    ).toThrow("future");
    expect(() =>
      setRoutineDone(data, "r1", "2026-10-20", "2026-10-20"),
    ).toThrow("non prévue");
  });
  it("conserve les faits passés après modification ou pause et peut les rouvrir", () => {
    const done = setRoutineDone(
      { ...emptyData(), routines: [routine()] },
      "r1",
      "2026-10-19",
      "2026-10-19",
    );
    done.routines[0] = routine({
      title: "Nouveau rythme",
      paused: true,
      time: "15:00",
      duration: 90,
    });
    const entries = dayAppointments(done, "2026-10-19");
    expect(entries).toMatchObject([
      {
        title: "Préparer la journée",
        start: "09:00",
        duration: 30,
        done: true,
      },
    ]);
    expect(dayAppointments(done, "2026-10-21")).toHaveLength(0);
    expect(
      setRoutineDone(done, "r1", "2026-10-19", "2026-10-19").routineEntries,
    ).toHaveLength(0);
  });
  it("le jardin ne déclare pas une journée libre si une routine reste à faire", () => {
    const data = { ...emptyData(), routines: [routine()] };
    expect(gardenDirection(data, "2026-10-19", "day", false).label).toBe(
      "Ouvrir mon programme",
    );
  });
});
describe("Objectifs et migration v3", () => {
  it("calcule une progression réversible et détache une tâche supprimée", () => {
    const tasks = [
      task(),
      task({ id: "t2", status: "done", completedAt: date }),
    ];
    const target = goal({ taskIds: ["t1", "t2"] });
    expect(goalProgress(target, tasks)).toEqual({
      done: 1,
      total: 2,
      percent: 50,
    });
    expect(goalProgress(goal({ taskIds: [] }), tasks).percent).toBe(0);
    tasks[1] = task({ id: "t2" });
    expect(goalProgress(target, tasks).percent).toBe(0);
    const removed = removeTask(
      { ...emptyData(), tasks, goals: [target] },
      "t1",
    );
    expect(removed.goals[0].taskIds).toEqual(["t2"]);
    expect(dataSchema.safeParse(removed).success).toBe(true);
  });
  it("migre v2 sans perdre les données existantes", () => {
    const { routines, routineEntries, goals, ...data } = emptyData();
    const old = { ...data, version: 2, tasks: [task()] };
    expect(storedDataSchema.parse(old)).toEqual({
      ...old,
      version: 3,
      routines,
      routineEntries,
      goals,
    });
  });
  it("restaure les horaires, routines, réalisations et objectifs sans perte", () => {
    const data = setRoutineDone(
      {
        ...emptyData(),
        tasks: [
          task({
            schedule: { day: "2026-10-19", start: "11:00", duration: 45 },
          }),
        ],
        routines: [routine()],
        goals: [goal()],
      },
      "r1",
      "2026-10-19",
      "2026-10-19",
    );
    expect(parseBackup(serializeBackup(data))).toEqual(data);
  });
  it("refuse les références orphelines et doublons sans les corriger silencieusement", () => {
    const data = setRoutineDone(
      { ...emptyData(), routines: [routine()] },
      "r1",
      "2026-10-19",
      "2026-10-19",
    );
    expect(dataSchema.safeParse({ ...data, routines: [] }).success).toBe(false);
    expect(
      dataSchema.safeParse({
        ...data,
        routineEntries: [
          ...data.routineEntries,
          { ...data.routineEntries[0], id: "duplicate" },
        ],
      }).success,
    ).toBe(false);
    expect(dataSchema.safeParse({ ...data, goals: [goal()] }).success).toBe(
      false,
    );
  });
});
