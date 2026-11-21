# Inveni

Inveni bedeutet für dieses Projekt „Ich habe die Lösung gefunden“. Inveni wird eine Rätsel-App für iOS und Android. Sie entsteht als Progressive Web App (PWA) für Smartphones und Tablets und startet ohne Anmeldung.

Die einzelnen Rätselarten und das Angebot an täglichen, wöchentlichen oder anderen Rätseln werden später festgelegt.

## Musterfeld

In jeder Schwierigkeitsstufe wird das Musterfeld zeilenweise von links nach rechts gelesen. Jede Zeile hat drei Felder. Die ersten beiden Zahlen ergeben nach derselben Regel die dritte, und das Fragezeichen steht rechts in der letzten Zeile. Die Schwierigkeit steigt über die Rechenregel.

## Lokal starten

Im Projektordner mit Python 3 ausführen:

```sh
python3 -m http.server 8000
```

Dann [http://localhost:8000](http://localhost:8000) öffnen. Die App besteht aus statischem HTML, CSS und JavaScript. Es gibt keinen Build-Schritt.

## Auf einem Mobilgerät installieren

Den Projektordner über HTTPS bereitstellen und die App-Adresse auf dem Gerät öffnen.

- **iPhone und iPad:** In Safari das Teilen-Menü öffnen, „Zum Home-Bildschirm“ wählen und, falls angezeigt, „Als Web-App öffnen“ aktivieren.
- **Android:** In Chrome im Menü „App installieren“ oder „Zum Startbildschirm hinzufügen“ wählen. Sobald der Browser die Installation direkt anbietet, kann sie auch aus Inveni gestartet werden.

Nach dem ersten vollständigen Online-Aufruf steht die Startansicht auch offline zur Verfügung.
