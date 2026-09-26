# Frida-IL2CPPDumper
A simple il2cpp dumper using frida with no dependencies. Since unity version varies and also protection added varies, often times we need to change some logic on the dumper to accomodate the diffrence of unity version or to bypass the protection that is enforced on the application. This repo functions to just be the bare minimum template for dumping, since there is no dependencies you can just copy and paste the `dump.ts` script and change the logic according to your needs.
- Tested on Frida 17.9.8
- Tested on Unity 6000.3.20f1 (Metadata version 39)
- Tested on Android ARM64

## How to run
```
frida -U -f com.DefaultCompany.Game -l dump.ts
```
After that call the `dump()` function

## Import to IDA
There is also a script to import the `dump.cs` to IDA. Just use the Script File `ida-import-unity-dump.py` and locate the generated dump file.

## Tips
This dumper uses the available `libil2cpp.so` exports, so if those exports are not changed from diffrent version or added protection, this dumper should run fine on many scenarios. Just keep in mind that `libil2pp.so` is used for android, for other platforms you should change this.
```
var il2cpp = Process.findModuleByName("libil2cpp.so");
```
Also for writing you probably need to modify it if you use a diffrent platform other than android.
```
function writeToFileInternal(name: String, data: String)
{
    Java.perform(() => {
        const ctx = Java.use("android.app.ActivityThread").currentApplication().getApplicationContext();
        const path = ctx.getFilesDir().getAbsolutePath() + "/" + name

        console.log(`[*] Writing on ${path}`)
        const file = new File(path, "w");
        file.write(data);
        file.flush();
        file.close();
    })
}
```

There is also some usefull logs when certain il2cpp function fails, those may help in understanding if the app have some kind of protections.

Also keep in mind that as unity version changes, the offset that may hold the name, address pointer, and other variables may also change. You may need to change it also if that happens, for example when reading method offsets on events.
```
let eventType = event.add(Process.pointerSize).readPointer()
let eventTypeName = "?"
if(!assertReturnsNull(eventType, "EventInfo->eventType"))
{
    let eventTypeNamePtr = il2cpp_type_get_name(eventType)
    if(!assertReturnsNull(eventTypeNamePtr, "il2cpp_type_get_name"))
    {
        eventTypeName = eventTypeNamePtr.readCString()
    }
}

let addMethod = event.add(Process.pointerSize * 3).readPointer()
let removeMethod = event.add(Process.pointerSize * 4).readPointer()
let raiseMethod = event.add(Process.pointerSize * 5).readPointer()
```
This reflects the il2cpp code for `EventInfo` struct
```
typedef struct EventInfo
{
    const char* name;
    const Il2CppType* eventType;
    Il2CppClass* parent;
    const MethodInfo* add;
    const MethodInfo* remove;
    const MethodInfo* raise;
    uint32_t token;
} EventInfo;
```

## Slop Info
Also some functions are generated especially when checking modifiers, just keep in mind that maybe those logic can be wrong. Good thing is from some testing it seems to generate valid answers when checked on whats actually on the csharp file. If you want to change it to actually reflect the real one, you can build your own unity project with all available modifiers and dump it to see the flags value for each methods, class, etc and then you map it.

Also the ida import are slop, but its readable and can easily be modified if needed.