// @ts-nocheck
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

//Warning: Slopped
function typeFlagsToString(f: number, isNested = false): string {
    const vis = f & 0x7;
    const m: string[] = [];

    if (isNested) {
        m.push(["private", "public", "private", "protected", "internal", "private protected", "protected internal"][vis] ?? "");
    } else {
        m.push(vis === 1 ? "public" : "internal");
    }

    if ((f & 0x180) === 0x180) m.push("static");
    else {
        if (f & 0x080) m.push("abstract");
        if (f & 0x100) m.push("sealed");
    }

    m.push((f & 0x20) ? "interface" : "class");
    return m.filter(Boolean).join(" ");
}

//Warning: Slopped
function methodFlagsToString(f: number): string {
    const m: string[] = [];
    m.push(["compilercontrolled", "private", "private protected", "internal", "protected", "protected internal", "public", ""][f & 0x7]);

    if (f & 0x0010) m.push("static");
    if (f & 0x0400) m.push("abstract");
    else if (f & 0x0040) m.push((f & 0x0100) ? "virtual" : "override");
    if ((f & 0x0020) && (f & 0x0040)) m.push("sealed");

    return m.filter(Boolean).join(" ");
}

//Warning: Slopped
function fieldFlagsToString(f: number): string {
    const m: string[] = [];
    m.push(["compilercontrolled", "private", "private protected", "internal", "protected", "protected internal", "public", ""][f & 0x7]);

    if (f & 0x0040) m.push("const");
    else {
        if (f & 0x0010) m.push("static");
        if (f & 0x0020) m.push("readonly");
    }
    return m.filter(Boolean).join(" ");
}

function dump()
{
    var dumps = []

    function assertReturnsNull(pointer: NativePointer, name: string)
    {
        if(pointer.isNull())
        {
            console.log(`[*] ${name} returns null!`)
            return true
        }

        return false
    }

    console.log("[*] Dumping")

    var il2cpp = Process.findModuleByName("libil2cpp.so");
    var base = il2cpp.base;

    var il2cpp_domain_get = new NativeFunction(il2cpp.findExportByName("il2cpp_domain_get"), 'pointer', [])
    var il2cpp_domain_get_assemblies = new NativeFunction(il2cpp.findExportByName("il2cpp_domain_get_assemblies"), 'pointer', ['pointer', 'pointer'])
    var il2cpp_assembly_get_image = new NativeFunction(il2cpp.findExportByName("il2cpp_assembly_get_image"), 'pointer', ['pointer'])
    var il2cpp_image_get_name = new NativeFunction(il2cpp.findExportByName("il2cpp_image_get_name"), 'pointer', ['pointer'])
    var il2cpp_image_get_class_count = new NativeFunction(il2cpp.findExportByName("il2cpp_image_get_class_count"), 'int', ['pointer'])
    var il2cpp_image_get_class = new NativeFunction(il2cpp.findExportByName("il2cpp_image_get_class"), 'pointer', ['pointer', 'int'])
    var il2cpp_class_from_name = new NativeFunction(il2cpp.findExportByName("il2cpp_class_from_name"), 'pointer', ['pointer', 'pointer', 'pointer'])
    var il2cpp_class_get_name = new NativeFunction(il2cpp.findExportByName("il2cpp_class_get_name"), 'pointer', ['pointer'])

    var il2cpp_class_get_methods = new NativeFunction(il2cpp.findExportByName("il2cpp_class_get_methods"), 'pointer', ['pointer', 'pointer'])
    var il2cpp_class_get_parent = new NativeFunction(il2cpp.findExportByName("il2cpp_class_get_parent"), 'pointer', ['pointer'])
    var il2cpp_method_get_name = new NativeFunction(il2cpp.findExportByName("il2cpp_method_get_name"), 'pointer', ['pointer'])
    var il2cpp_method_get_param_count = new NativeFunction(il2cpp.findExportByName("il2cpp_method_get_param_count"), 'int', ['pointer'])
    var il2cpp_method_get_param_name = new NativeFunction(il2cpp.findExportByName("il2cpp_method_get_param_name"), 'pointer', ['pointer', 'int'])
    var il2cpp_method_get_param = new NativeFunction(il2cpp.findExportByName("il2cpp_method_get_param"), 'pointer', ['pointer', 'int'])
    var il2cpp_method_get_return_type = new NativeFunction(il2cpp.findExportByName("il2cpp_method_get_return_type"), 'pointer', ['pointer'])
    var il2cpp_type_get_name = new NativeFunction(il2cpp.findExportByName("il2cpp_type_get_name"), 'pointer', ['pointer'])

    var il2cpp_class_get_fields = new NativeFunction(il2cpp.findExportByName("il2cpp_class_get_fields"), 'pointer', ['pointer', 'pointer'])
    var il2cpp_field_get_name = new NativeFunction(il2cpp.findExportByName("il2cpp_field_get_name"), 'pointer', ['pointer'])
    var il2cpp_field_get_offset = new NativeFunction(il2cpp.findExportByName("il2cpp_field_get_offset"), 'int', ['pointer'])
    var il2cpp_field_get_type = new NativeFunction(il2cpp.findExportByName("il2cpp_field_get_type"), 'pointer', ['pointer'])

    var il2cpp_class_get_properties = new NativeFunction(il2cpp.findExportByName("il2cpp_class_get_properties"), 'pointer', ['pointer', 'pointer'])
    var il2cpp_property_get_name = new NativeFunction(il2cpp.findExportByName("il2cpp_property_get_name"), 'pointer', ['pointer'])
    var il2cpp_property_get_get_method = new NativeFunction(il2cpp.findExportByName("il2cpp_property_get_get_method"), 'pointer', ['pointer'])
    var il2cpp_property_get_set_method = new NativeFunction(il2cpp.findExportByName("il2cpp_property_get_set_method"), 'pointer', ['pointer'])

    var il2cpp_class_get_events = new NativeFunction(il2cpp.findExportByName("il2cpp_class_get_events"), 'pointer', ['pointer', 'pointer'])

    var il2cpp_field_get_flags = new NativeFunction(il2cpp.findExportByName("il2cpp_field_get_flags"), 'int', ['pointer'])
    var il2cpp_class_get_flags = new NativeFunction(il2cpp.findExportByName("il2cpp_class_get_flags"), 'int', ['pointer'])
    var il2cpp_method_get_flags = new NativeFunction(il2cpp.findExportByName("il2cpp_method_get_flags"), 'int', ['pointer', 'pointer'])
    var il2cpp_class_get_declaring_type = new NativeFunction(il2cpp.findExportByName("il2cpp_class_get_declaring_type"), 'pointer', ['pointer'])

    function methodModifiers(method: NativePointer)
    {
        if(method.isNull())
        {
            return ""
        }

        return methodFlagsToString(il2cpp_method_get_flags(method, NULL))
    }
    
    function dumpField(field: NativePointer)
    {
        let fieldNamePtr = il2cpp_field_get_name(field)
        if(assertReturnsNull(fieldNamePtr, "il2cpp_field_get_name"))
        {
            return
        }
        let fieldName = fieldNamePtr.readCString()

        let fieldType = il2cpp_field_get_type(field)
        if(assertReturnsNull(fieldType, "il2cpp_field_get_type"))
        {
            return
        }
        let fieldTypeNamePtr = il2cpp_type_get_name(fieldType)
        if(assertReturnsNull(fieldTypeNamePtr, "il2cpp_type_get_name"))
        {
            return
        }
        let fieldTypeName = fieldTypeNamePtr.readCString()

        let offset = il2cpp_field_get_offset(field)
        let modifiers = fieldFlagsToString(il2cpp_field_get_flags(field))
        
        dumps.push(`\t//offset: ${ptr(offset).toString()}`)
        dumps.push(`\t${modifiers} ${fieldTypeName} ${fieldName};`)
    }

    //Warning: Slopped
    function dumpProperty(property: NativePointer)
    {
        let propertyNamePtr = il2cpp_property_get_name(property)
        if(assertReturnsNull(propertyNamePtr, "il2cpp_property_get_name"))
        {
            return
        }
        let propertyName = propertyNamePtr.readCString()

        let getMethod = il2cpp_property_get_get_method(property)
        let setMethod = il2cpp_property_get_set_method(property)

        // property type comes from the getter's return type, or the setter's first param
        let propertyType = ptr(0)
        if(!getMethod.isNull())
        {
            propertyType = il2cpp_method_get_return_type(getMethod)
        }
        else if(!setMethod.isNull())
        {
            propertyType = il2cpp_method_get_param(setMethod, 0)
        }

        let propertyTypeName = "?"
        if(!propertyType.isNull())
        {
            let propertyTypeNamePtr = il2cpp_type_get_name(propertyType)
            if(!assertReturnsNull(propertyTypeNamePtr, "il2cpp_type_get_name"))
            {
                propertyTypeName = propertyTypeNamePtr.readCString()
            }
        }

        let accessors = ""
        if(!getMethod.isNull())
        {
            accessors += "get; "
        }
        if(!setMethod.isNull())
        {
            accessors += "set; "
        }

        let getOffset = getMethod.isNull() ? "none" : getMethod.readPointer().sub(base).toString()
        let setOffset = setMethod.isNull() ? "none" : setMethod.readPointer().sub(base).toString()

        // properties have no access flags of their own, C# shows the accessor's
        let modifiers = methodModifiers(getMethod.isNull() ? setMethod : getMethod)

        dumps.push(`\t//get_base: ${getOffset} set_base: ${setOffset}`)
        dumps.push(`\t${modifiers} ${propertyTypeName} ${propertyName} { ${accessors}}`)
    }

    //Warning: Slopped
    function dumpEvent(event: NativePointer)
    {
        let eventNamePtr = event.readPointer()
        if(assertReturnsNull(eventNamePtr, "EventInfo->name"))
        {
            return
        }
        let eventName = eventNamePtr.readCString()

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

        let addOffset = addMethod.isNull() ? "none" : addMethod.readPointer().sub(base).toString()
        let removeOffset = removeMethod.isNull() ? "none" : removeMethod.readPointer().sub(base).toString()
        let raiseOffset = raiseMethod.isNull() ? "none" : raiseMethod.readPointer().sub(base).toString()

        // events have no access flags of their own either, use the add accessor's
        let modifiers = methodModifiers(addMethod)

        dumps.push(`\t//add_base: ${addOffset} remove_base: ${removeOffset} raise_base: ${raiseOffset}`)
        dumps.push(`\t${modifiers} event ${eventTypeName} ${eventName};`)
    }

    function dumpMethod(method: NativePointer)
    {
        let methodNamePtr = il2cpp_method_get_name(method)
        if(assertReturnsNull(methodNamePtr, "il2cpp_method_get_name"))
        {
            return
        }

        let methodPointer = method.readPointer()
        let methodPointerBase = methodPointer.sub(base)
        let virtualMethodPointer = method.add(Process.pointerSize).readPointer()
        let virtualMethodPointerBase = virtualMethodPointer.sub(base)

        let methodName = methodNamePtr.readCString()
        let paramCount = il2cpp_method_get_param_count(method)

        let retType = il2cpp_method_get_return_type(method)
        if(assertReturnsNull(retType, "il2cpp_method_get_return_type"))
        {
            return
        }

        let retTypeNamePtr = il2cpp_type_get_name(retType)
        if(assertReturnsNull(retTypeNamePtr, "il2cpp_type_get_name"))
        {
            return
        }
        let retTypeName = retTypeNamePtr.readCString()

        let paramNames = [];
        for (let i = 0; i < paramCount; i++)
        {
            let param = il2cpp_method_get_param(method, i)
            if(assertReturnsNull(param, "il2cpp_method_get_param"))
            {
                return
            }
            let paramTypeNamePtr = il2cpp_type_get_name(param)
            let paramTypeName = paramTypeNamePtr.readCString()

            let paramNamePtr = il2cpp_method_get_param_name(method, i);
            if(assertReturnsNull(paramNamePtr, "il2cpp_method_get_param_name"))
            {
                return
            }
            let paramName = paramNamePtr.readCString()

            paramNames.push(`${paramTypeName} ${paramName}`);
        }

        let paramNameAll = paramNames.join(", ")

        dumps.push(`\t//offset: ${methodPointer.toString()} offset_base:${methodPointerBase.toString()} virtual: ${virtualMethodPointer.toString()} virtual_base: ${virtualMethodPointerBase.toString()}`)
        let modifiers = methodModifiers(method)

        dumps.push(`\t${modifiers} ${retTypeName} ${methodName}(${paramNameAll});`)
    }

    function dumpClass(cls: NativePointer)
    {
        let namePtr = il2cpp_class_get_name(cls)
        if(assertReturnsNull(namePtr, "il2cpp_class_get_name"))
        {
            return
        }
        let name = namePtr.readCString()

        let parentCls = il2cpp_class_get_parent(cls)
        let parentClsName = ""

        if(!parentCls.isNull())
        {
            let parentClsNamePtr = il2cpp_class_get_name(parentCls)
            parentClsName = parentClsNamePtr.readCString()
        }

        let isNested = !il2cpp_class_get_declaring_type(cls).isNull()
        let modifiers = typeFlagsToString(il2cpp_class_get_flags(cls), isNested)

        if(parentClsName !== "")
        {
            dumps.push(`${modifiers} ${name} : ${parentClsName}`)
        }
        else
        {
            dumps.push(`${modifiers} ${name}`)
        }
        dumps.push(`{`)

        let iteration = Memory.alloc(Process.pointerSize)
        iteration.writePointer(ptr(0))

        let fieldCount = 0

        while(true)
        {
            let field = il2cpp_class_get_fields(cls, iteration)

            if(field.isNull())
            {
                break
            }

            if(fieldCount != 0)
            {
                dumps.push("")
            }

            dumpField(field)
            fieldCount++
        }

        if(fieldCount != 0)
        {
            dumps.push("")
        }

        iteration.writePointer(ptr(0))

        let propertyCount = 0

        while(true)
        {
            let property = il2cpp_class_get_properties(cls, iteration)

            if(property.isNull())
            {
                break
            }

            if(propertyCount != 0)
            {
                dumps.push("")
            }

            try
            {
                dumpProperty(property)
                propertyCount++
            }
            catch(e)
            {
                console.log(`[*] ${name}: skipped property ${property}, ${e.message}`)
            }
        }

        if(propertyCount != 0)
        {
            dumps.push("")
        }

        iteration.writePointer(ptr(0))

        let eventCount = 0

        while(true)
        {
            let event = il2cpp_class_get_events(cls, iteration)

            if(event.isNull())
            {
                break
            }

            if(eventCount != 0)
            {
                dumps.push("")
            }

            try
            {
                dumpEvent(event)
                eventCount++
            }
            catch(e)
            {
                console.log(`[*] ${name}: skipped event ${event}, ${e.message}`)
            }
        }

        if(eventCount != 0)
        {
            dumps.push("")
        }

        iteration.writePointer(ptr(0))

        let methodCount = 0

        while(true)
        {
            let method = il2cpp_class_get_methods(cls, iteration)

            if(method.isNull())
            {
                break
            }

            if(methodCount != 0)
            {
                dumps.push("")
            }

            dumpMethod(method)
            methodCount++
        }

        dumps.push(`}`)
    }

    function dumpAssembly(assembly: NativePointer)
    {
        let image = il2cpp_assembly_get_image(assembly);
        if(assertReturnsNull(image, "il2cpp_assembly_get_image"))
        {
            return
        }

        let namePtr = il2cpp_image_get_name(image);
        if(assertReturnsNull(namePtr, "il2cpp_image_get_name"))
        {
            return
        }
        let name = namePtr.readCString();

        console.log(`[*] Dumping assembly ${name}`);

        let classCount = il2cpp_image_get_class_count(image)

        console.log(`[*] Dumping ${classCount} classes`);

        dumps.push(`//Assembly: ${name}`)

        for(let i = 0; i < classCount; i++)
        {
            let cls = il2cpp_image_get_class(image, i)

            if(assertReturnsNull(cls, "il2cpp_image_get_class"))
            {
                return
            }

            if(i != 0)
            {
                dumps.push("")
            }
            dumpClass(cls)
        }
    }

    let domain = il2cpp_domain_get();
    if(assertReturnsNull(domain, "il2cpp_domain_get"))
    {
        return
    }

    let sizePtr = Memory.alloc(8);
    let assemblies = il2cpp_domain_get_assemblies(domain, sizePtr);
    if(assertReturnsNull(assemblies, "il2cpp_domain_get_assemblies"))
    {
        return
    }

    let count = sizePtr.readU64().toNumber();
    console.log(`[*] Enumerating ${count} assemblies`)

    for (let i = 0; i < count; i++)
    {
        let current = assemblies.add(i * Process.pointerSize).readPointer();

        if(i != 0)
        {
            dumps.push("")
        }
        dumpAssembly(current)
    }

    console.log("[*] Writing dump!")

    let complete = dumps.join("\n");

    writeToFileInternal("dump.cs", complete)
    console.log("[*] Dump done!")
}

(globalThis as any).dump = dump;