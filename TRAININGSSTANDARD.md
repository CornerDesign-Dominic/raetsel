# Trainingsstandard für Inveni

Das 1×1-Training und Pfeilfolge sind die Referenzen. Verwende diese Struktur für neue Trainings und für Änderungen an bestehenden Trainings.

## Vor dem Spiel

Das gemeinsame Auswahlmodal aus `puzzle-levels.js` zeigt den Spielnamen und pro Seite genau eine Stufe oder einen Modus. Mit den Pfeilen oder per Wischgeste wechselt man die Seite. Unter der Stufe stehen fünf Zeilen für die persönlichen Ergebnisse dieser Stufe. Wo es eine Wertung gibt, verwendet das Training seine eigene Sortierung. Beim 1×1 zählen zuerst weniger Fehler und bei Gleichstand weniger Sekunden pro Antwort. Das × oben rechts schließt die Auswahl.

## Während des Spiels

| Position | Inhalt |
| --- | --- |
| Oben | Eine schmale Leiste mit dem relevanten Stand des Durchlaufs, etwa Zeit und Zahl der Antworten, Aufgabe 2 von 8 oder Länge der Pfeilfolge. Rechts steht der Kreispfeil für den Reset. |
| Mitte | Eine große Spielfläche mit der aktuellen Aufgabe oder Szene. Im Bereitschaftszustand startet ein Tipp auf die Fläche den Durchlauf. Verwende „Tippe, um zu beginnen“. |
| Unten | Der feste Eingabebereich für einen Zahlenblock, Richtungstasten oder eine vergleichbare Steuerung. Bei direkter Interaktion, etwa mit Karten und Blasen, sind die Elemente der Spielfläche selbst die Tippziele. |

Der Reset fragt über ein gemeinsames Modal nach. Die Bestätigung verwirft den laufenden Durchlauf und öffnet den Bereitschaftszustand derselben Stufe. Das × bricht die Abfrage ab. Ein verworfener Durchlauf zählt nicht als Ergebnis. In einem endlosen Modus kann die Aktion „Beenden“ einen Durchlauf bewusst mit Ergebnis abschließen.

Nutze die Fläche des Geräts mit kleinen Außenabständen und gut erreichbaren Tasten. Auf dem Handy im Hochformat steht die Eingabe am unteren Rand. Bei geringer Höhe im Querformat darf sie neben der Aufgabe stehen. Der Spielbereich bleibt fest und die App-Navigation ist während des Spiels ausgeblendet.

## Zahlenblock

Verwende `mountNumberPad()` aus `number-pad.js` zusammen mit `.training-controls`, `.training-pad` und `.number-training-submit`. Die Anordnung, Eingabelogik und die Taste zum Leeren des aktiven Felds werden zentral gepflegt. Setze an numerischen Trainingsfeldern `inputmode="none"`, damit der Inveni-Zahlenblock sichtbar bleibt. Bei mehreren Eingabefeldern übergib eine Funktion, die das aktive Feld liefert. Die Tastatur am Rechner bleibt nutzbar. Der Kreispfeil im Zahlenblock leert nur die Eingabe. Der Kreispfeil oben setzt den Durchlauf zurück.

## Nach dem Durchlauf

Das gemeinsame Ergebnismodal zeigt die Spielwertung. Wo persönliche Rekorde gespeichert und verglichen werden, erhält die erste oder eine verbesserte Bestleistung eine eigene Erfolgsmeldung. „Nochmal“ öffnet den Bereitschaftszustand derselben Stufe und „Verlassen“ führt zur Trainingsübersicht. Das × schließt das Modal. Die Spielfläche bietet danach „Ergebnis anzeigen“ an.

Verwende `mountTrainingSession()` aus `training-session.js` für Reset und Ergebnis und `addStageAction()` für eine antippbare Spielfläche. Gib beim Verlassen der Route Timer, Animationen und Dialoge frei.
